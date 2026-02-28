import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { Events } from "@wailsio/runtime";
import { marked } from "marked";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPen, faSlash, faThumbtack, faTrashCan, faXmark } from "@fortawesome/free-solid-svg-icons";
import { NotesService } from "../../bindings/github.com/eryalito/pinthenote/internal/services";
import { Note, WindowState } from "../../bindings/github.com/eryalito/pinthenote/internal/models";
import ConfirmModal from "../components/ConfirmModal";
import "./NoteView.css";

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
    const colorInputRef = useRef<HTMLInputElement | null>(null);

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

    const emitWindowAction = (action: "pin" | "close") => {
        void Events.Emit("note:window-action", {
            action,
            noteId: note.ID,
        });
    };

    const toggleEditMode = async () => {
        if (!isEditing) {
            setDraftContent(note.content ?? "");
            setIsEditing(true);
            return;
        }

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
            setShowDeleteModal(false);
        } catch {
            setError("Failed to delete note.");
        } finally {
            setDeletingNote(false);
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
                    <button
                        onClick={() => {
                            void toggleEditMode();
                        }}
                        className="note-nav-button"
                        title={isEditing ? "Cancel" : "Edit"}
                        aria-label={isEditing ? "Cancel" : "Edit"}
                    >
                        <span className="note-edit-icon-stack" aria-hidden="true">
                            <FontAwesomeIcon icon={faPen} />
                            {isEditing && (
                                <FontAwesomeIcon icon={faSlash} className="note-edit-icon-slash" />
                            )}
                        </span>
                    </button>
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
                        onClick={() => emitWindowAction("close")}
                        className="note-nav-button"
                        title="Close"
                        aria-label="Close"
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

            <div className={`note-content ${isEditing ? "editing" : "viewing"}`}>
                {isEditing ? (
                    <textarea
                        value={draftContent}
                        onChange={(event) => setDraftContent(event.target.value)}
                        className="note-textarea"
                    />
                ) : (
                    <div
                        className="note-markdown"
                        dangerouslySetInnerHTML={{ __html: marked(note.content ?? "") }}
                    />
                )}
            </div>
        </main>
    );
}
