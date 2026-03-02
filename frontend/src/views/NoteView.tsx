import { useEffect, useRef, useState, useMemo } from "react";
import { useParams } from "react-router-dom";
import { Events } from "@wailsio/runtime";
import { marked } from "marked";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMagnifyingGlassMinus, faMagnifyingGlassPlus, faSlash, faThumbtack, faTrashCan, faXmark, faArrowRotateLeft } from "@fortawesome/free-solid-svg-icons";
import { NotesService } from "../../bindings/github.com/eryalito/pinthenote/internal/services";
import { ContentType, Note, WindowState } from "../../bindings/github.com/eryalito/pinthenote/internal/models";
import ConfirmModal from "../components/ConfirmModal";
import "./NoteView.css";

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.1;
const CONTENT_TYPE_PLAIN = ContentType.ContentTypePlain;
const CONTENT_TYPE_MARKDOWN = ContentType.ContentTypeMarkdown;
const CONTENT_TYPE_HTML = ContentType.ContentTypeHTML;

const normalizeContentType = (value: ContentType | string | undefined): ContentType => {
    if (value === CONTENT_TYPE_MARKDOWN || value === CONTENT_TYPE_HTML || value === CONTENT_TYPE_PLAIN) {
        return value;
    }

    return CONTENT_TYPE_PLAIN;
};

const clampZoom = (value: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value));
const roundZoom = (value: number) => Number(value.toFixed(1));

export default function NoteView() {
    const { id } = useParams<{ id: string }>();
    const [note, setNote] = useState<Note | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showTopNav, setShowTopNav] = useState(false);
    const [showFooter, setShowFooter] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [draftContent, setDraftContent] = useState("");
    const [saving, setSaving] = useState(false);
    const [editingTitle, setEditingTitle] = useState(false);
    const [draftTitle, setDraftTitle] = useState("");
    const [savingTitle, setSavingTitle] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deletingNote, setDeletingNote] = useState(false);
    const [editingColor, setEditingColor] = useState(false);
    const [draftColor, setDraftColor] = useState("#FFEBA1");
    const [savingColor, setSavingColor] = useState(false);
    const [savingZoom, setSavingZoom] = useState(false);
    const [savingContentType, setSavingContentType] = useState(false);
    const colorInputRef = useRef<HTMLInputElement | null>(null);

    const contentType = normalizeContentType(note?.content_type);

    const renderedHtmlContent = useMemo(() => {
        const content = note?.content ?? "";
        if (!content) {
            return "";
        }

        if (contentType === CONTENT_TYPE_HTML) {
            return content;
        }

        if (contentType === CONTENT_TYPE_MARKDOWN) {
            const result = marked.parse(content);
            return typeof result === "string" ? result : "";
        }

        return "";
    }, [note?.content, contentType]);

    useEffect(() => {
        if (editingColor) {
            colorInputRef.current?.click();
        }
    }, [editingColor]);

    useEffect(() => {
        let cancelled = false;

        async function loadNote() {
            if (!id) {
                setError("Invalid note id.");
                setLoading(false);
                return;
            }

            const noteID = Number(id);
            if (!Number.isFinite(noteID)) {
                setError("Invalid note id.");
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                setError(null);

                const data = await NotesService.RetrieveNote(noteID);

                if (!cancelled) {
                    setNote(data ?? null);
                    setDraftContent(data?.content ?? "");
                }
            } catch {
                if (!cancelled) setError("Failed to load note.");
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        loadNote();

        const unsubscribe = Events.On("note:updated", (event: any) => {
            const eventNoteID = Number(event?.data?.noteId);
            if (!Number.isFinite(eventNoteID) || !id) {
                return;
            }

            const currentNoteID = Number(id);
            if (!Number.isFinite(currentNoteID) || currentNoteID !== eventNoteID) {
                return;
            }

            void loadNote();
        });

        const unsubscribePin = Events.On("note:pin-changed", (event: any) => {
            const eventNoteID = Number(event?.data?.noteId);
            const pinned = event?.data?.pinned === true;
            if (!Number.isFinite(eventNoteID) || !id) {
                return;
            }

            const currentNoteID = Number(id);
            if (!Number.isFinite(currentNoteID) || currentNoteID !== eventNoteID) {
                return;
            }

            setNote((prev) => {
                if (!prev) {
                    return prev;
                }

                return new Note({
                    ...prev,
                    window_state: new WindowState({
                        ...(prev.window_state ?? {}),
                        note_id: prev.ID,
                        pinned,
                    }),
                });
            });
        });

        return () => {
            cancelled = true;
            unsubscribe();
            unsubscribePin();
        };
    }, [id]);

    if (loading) {
        return (
            <div className="loading-container">
                <div>Loading note...</div>
            </div>
        );
    }

    if (error) return <div>{error}</div>;
    if (!note) return <div>Note not found.</div>;

    const isPinned = note.window_state?.pinned === true;
    const currentZoom = note.zoom_multiplier && note.zoom_multiplier > 0 ? note.zoom_multiplier : 1;
    const zoomScaleStyle = {
        transformOrigin: "0% 0%",
        transform: `scale(${currentZoom})`,
        width: `${100 / currentZoom}%`,
        minHeight: `${100 / currentZoom}%`,
    };

    const emitWindowAction = (action: "pin" | "close") => {
        void Events.Emit("note:window-action", {
            action,
            noteId: note.ID,
        });
    };

    const startEditMode = () => {
        setDraftContent(note.content ?? "");
        setIsEditing(true);
    };

    const cancelEditMode = () => {
        setDraftContent(note.content ?? "");
        setIsEditing(false);
    };

    const saveDraft = async () => {
        if (draftContent !== (note.content ?? "")) {
            try {
                setSaving(true);
                const updatedNote = new Note({ ...note, content: draftContent });
                await NotesService.UpdateNote(updatedNote);
                setNote(updatedNote);
            } catch {
                setError("Failed to save note.");
                return;
            } finally {
                setSaving(false);
            }
        }
        setIsEditing(false);
    };

    const startEditTitle = () => {
        setDraftTitle(note.title ?? "");
        setEditingTitle(true);
    };

    const cancelEditTitle = () => {
        if (savingTitle) {
            return;
        }

        setEditingTitle(false);
        setDraftTitle("");
    };

    const commitEditTitle = async () => {
        if (savingTitle) {
            return;
        }

        const currentTitle = note.title ?? "";
        const nextTitle = draftTitle.trim();

        if (!nextTitle || nextTitle === currentTitle) {
            setEditingTitle(false);
            setDraftTitle("");
            return;
        }

        try {
            setSavingTitle(true);
            setError(null);

            const updatedNote = new Note({ ...note, title: nextTitle });
            await NotesService.UpdateNote(updatedNote);
            await Events.Emit("note:updated", { noteId: note.ID });

            setNote(updatedNote);
            setEditingTitle(false);
            setDraftTitle("");
        } catch {
            setError("Failed to update note title.");
        } finally {
            setSavingTitle(false);
        }
    };

    const startEditColor = () => {
        setDraftColor(note.color || "#FFEBA1");
        setEditingColor(true);
    };

    const cancelEditColor = () => {
        if (savingColor) {
            return;
        }

        setEditingColor(false);
        setDraftColor("#FFEBA1");
    };

    const commitEditColor = async (nextColor: string) => {
        if (savingColor) {
            return;
        }

        const currentColor = note.color || "#FFEBA1";
        if (!nextColor || nextColor === currentColor) {
            setEditingColor(false);
            setDraftColor("#FFEBA1");
            return;
        }

        try {
            setSavingColor(true);
            setError(null);

            const updatedNote = new Note({ ...note, color: nextColor });
            await NotesService.UpdateNote(updatedNote);
            await Events.Emit("note:updated", { noteId: note.ID });

            setNote(updatedNote);
            setEditingColor(false);
            setDraftColor("#FFEBA1");
        } catch {
            setError("Failed to update note color.");
        } finally {
            setSavingColor(false);
        }
    };

    const confirmDeleteNote = async () => {
        try {
            setDeletingNote(true);
            setError(null);
            await NotesService.DeleteNote(note.ID);
            await Events.Emit("note:deleted", { noteId: note.ID });
            setShowDeleteModal(false);
        } catch {
            setError("Failed to delete note.");
        } finally {
            setDeletingNote(false);
        }
    };

    const updateContentType = async (nextContentType: ContentType | string) => {
        if (savingContentType) {
            return;
        }

        const normalizedNext = normalizeContentType(nextContentType);

        const previousContentType = normalizeContentType(note.content_type);
        if (normalizedNext === previousContentType) {
            return;
        }

        const optimisticNote = new Note({ ...note, content_type: normalizedNext });
        setNote(optimisticNote);

        try {
            setSavingContentType(true);
            setError(null);
            await NotesService.UpdateNote(optimisticNote);
            await Events.Emit("note:updated", { noteId: note.ID });
        } catch {
            setNote(new Note({ ...note, content_type: previousContentType }));
            setError("Failed to update content type.");
        } finally {
            setSavingContentType(false);
        }
    };

    const resetZoom = async () => {
        if (savingZoom || currentZoom === 1) {
            return;
        }
        const previousZoom = currentZoom;
        const nextZoom = 1;
        return updateZoom(nextZoom - previousZoom);
    }

    const updateZoom = async (delta: number) => {
        if (savingZoom) {
            return;
        }

        const previousZoom = currentZoom;
        const nextZoom = roundZoom(clampZoom(previousZoom + delta));

        if (nextZoom === previousZoom) {
            return;
        }

        const optimisticNote = new Note({ ...note, zoom_multiplier: nextZoom });
        setNote(optimisticNote);

        try {
            setSavingZoom(true);
            setError(null);
            await NotesService.UpdateNote(optimisticNote);
            await Events.Emit("note:updated", { noteId: note.ID });
        } catch {
            setNote(new Note({ ...note, zoom_multiplier: previousZoom }));
            setError("Failed to update zoom.");
        } finally {
            setSavingZoom(false);
        }
    };

    return (
        <main className="note-main" style={{ backgroundColor: note.color, color: note.text_color }}>
            <div
                className="note-nav-trigger"
                onMouseEnter={() => setShowTopNav(true)}
            />

            <nav
                onMouseEnter={() => setShowTopNav(true)}
                onMouseLeave={() => !isEditing && !editingTitle && setShowTopNav(false)}
                className={`note-nav ${isEditing || editingTitle || showTopNav ? "visible" : "hidden"}`}
                style={{ backgroundColor: "rgba(27, 38, 54, 0.88)" }}
            >
                <div className="note-nav-left">
                    <button
                        onClick={() => emitWindowAction("pin")}
                        className="note-nav-button"
                        title={isPinned ? "Unpin" : "Pin"}
                        aria-label={isPinned ? "Unpin" : "Pin"}
                    >
                        <span className="note-pin-icon-stack" aria-hidden="true">
                            <FontAwesomeIcon icon={faThumbtack} />
                            {isPinned && (
                                <FontAwesomeIcon icon={faSlash} className="note-pin-icon-slash" />
                            )}
                        </span>
                    </button>
                    {editingTitle ? (
                        <input
                            className="note-window-title-input"
                            value={draftTitle}
                            onChange={(event) => setDraftTitle(event.target.value)}
                            onBlur={() => {
                                void commitEditTitle();
                            }}
                            onKeyDown={(event) => {
                                if (event.key === "Enter") {
                                    event.preventDefault();
                                    void commitEditTitle();
                                }
                                if (event.key === "Escape") {
                                    event.preventDefault();
                                    cancelEditTitle();
                                }
                            }}
                            disabled={savingTitle}
                            autoFocus
                        />
                    ) : (
                        <strong
                            className="note-window-title"
                            onDoubleClick={(event) => {
                                event.preventDefault();
                                event.stopPropagation();
                                startEditTitle();
                            }}
                            title="Double click to rename"
                        >
                            {note.title || "Untitled note"}
                        </strong>
                    )}
                </div>

                <div className="note-nav-right">
                    {isEditing && (
                        <button
                            onClick={() => {
                                void saveDraft();
                            }}
                            disabled={saving}
                            className="note-nav-action-btn"
                            title="Save"
                            aria-label="Save"
                        >
                            {saving ? "Saving" : "Save"}
                        </button>
                    )}

                    <button
                        onClick={() => {
                            if (isEditing) {
                                cancelEditMode();
                                return;
                            }

                            emitWindowAction("close");
                        }}
                        className="note-nav-button"
                        title={isEditing ? "Cancel" : "Close"}
                        aria-label={isEditing ? "Cancel" : "Close"}
                    >
                        <FontAwesomeIcon icon={faXmark} />
                    </button>
                </div>
            </nav>

            <div
                className="note-footer-trigger"
                onMouseEnter={() => setShowFooter(true)}
            />

            <footer
                onMouseEnter={() => setShowFooter(true)}
                onMouseLeave={() => setShowFooter(false)}
                className={`note-footer ${showFooter ? "visible" : "hidden"}`}
                style={{ backgroundColor: "rgba(27, 38, 54, 0.88)" }}
            >
                <div className="note-footer-left">
                    {editingColor ? (
                        <input
                            ref={colorInputRef}
                            type="color"
                            className="note-footer-color-input"
                            value={draftColor}
                            onChange={(event) => {
                                setDraftColor(event.target.value);
                            }}
                            onBlur={() => {
                                void commitEditColor(draftColor);
                            }}
                            onKeyDown={(event) => {
                                if (event.key === "Escape") {
                                    event.preventDefault();
                                    cancelEditColor();
                                }
                            }}
                            onClick={(event) => {
                                event.stopPropagation();
                            }}
                            onMouseDown={(event) => {
                                event.stopPropagation();
                            }}
                            disabled={savingColor}
                            autoFocus
                        />
                    ) : (
                        <span
                            className="note-footer-color"
                            style={{ backgroundColor: note.color || "#FFEBA1" }}
                            onDoubleClick={(event) => {
                                event.preventDefault();
                                event.stopPropagation();
                                startEditColor();
                            }}
                            title="Double click to edit color"
                        />
                    )}

                    <button
                        type="button"
                        className="note-footer-zoom-btn"
                        onClick={() => {
                            void updateZoom(-ZOOM_STEP);
                        }}
                        disabled={savingZoom || currentZoom <= MIN_ZOOM}
                        title="Zoom out"
                        aria-label="Zoom out"
                    >
                        <FontAwesomeIcon icon={faMagnifyingGlassMinus} />
                    </button>

                    <button
                        type="button"
                        className="note-footer-zoom-btn"
                        onClick={() => {
                            void resetZoom();
                        }}
                        disabled={savingZoom || currentZoom == 1}
                        title="Reset zoom"
                        aria-label="Reset zoom"
                    >
                        <FontAwesomeIcon icon={faArrowRotateLeft} />
                    </button>

                    <button
                        type="button"
                        className="note-footer-zoom-btn"
                        onClick={() => {
                            void updateZoom(ZOOM_STEP);
                        }}
                        disabled={savingZoom || currentZoom >= MAX_ZOOM}
                        title="Zoom in"
                        aria-label="Zoom in"
                    >
                        <FontAwesomeIcon icon={faMagnifyingGlassPlus} />
                    </button>

                    <select
                        className="note-footer-content-type-select"
                        value={contentType}
                        onChange={(event) => {
                            void updateContentType(event.target.value);
                        }}
                        disabled={savingContentType}
                        title="Content type"
                        aria-label="Content type"
                    >
                        <option value={CONTENT_TYPE_PLAIN}>Text</option>
                        <option value={CONTENT_TYPE_MARKDOWN}>Markdown</option>
                        <option value={CONTENT_TYPE_HTML}>HTML</option>
                    </select>
                </div>

                <div className="note-footer-right">
                    <button
                        type="button"
                        className="note-footer-delete-btn"
                        onClick={() => setShowDeleteModal(true)}
                        disabled={deletingNote}
                        title={deletingNote ? "Deleting" : "Delete note"}
                        aria-label={deletingNote ? "Deleting" : "Delete note"}
                    >
                        <FontAwesomeIcon icon={faTrashCan} />
                    </button>
                </div>
            </footer>

            <ConfirmModal
                isOpen={showDeleteModal}
                title="Delete note?"
                message={
                    <>
                        This will permanently delete <strong>{note.title || "Untitled note"}</strong>.
                    </>
                }
                confirmLabel={deletingNote ? "Deleting..." : "Delete"}
                confirmDisabled={deletingNote}
                onCancel={() => setShowDeleteModal(false)}
                onConfirm={() => {
                    void confirmDeleteNote();
                }}
            />

            <div className="full-size">
                <div
                    className={`note-content ${isEditing ? "editing" : "viewing"}`}
                    onDoubleClick={() => {
                        if (!isEditing) {
                            startEditMode();
                        }
                    }}
                    title={!isEditing ? "Double click to edit" : undefined}
                >
                    {isEditing ? (
                        <textarea
                            value={draftContent}
                            onChange={(event) => setDraftContent(event.target.value)}
                            onKeyDown={(event) => {
                                if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
                                    event.preventDefault();
                                    void saveDraft();
                                    return;
                                }

                                if (event.key === "Escape") {
                                    event.preventDefault();
                                    cancelEditMode();
                                }
                            }}
                            className="note-textarea"
                        />
                    ) : (
                        <div className="note-content-scale" style={zoomScaleStyle}>
                            {contentType === CONTENT_TYPE_PLAIN ? (
                                <div className="note-markdown" style={{ whiteSpace: "pre-wrap" }}>
                                    {note.content ?? ""}
                                </div>
                            ) : (
                                <div
                                    className="note-markdown"
                                    dangerouslySetInnerHTML={{ __html: renderedHtmlContent }}
                                />
                            )}
                        </div>
                    )}
                </div>
            </div>
        </main>
    );
}
