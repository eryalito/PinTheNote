import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Events } from "@wailsio/runtime";
import { marked } from "marked";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPen, faSlash, faThumbtack, faXmark } from "@fortawesome/free-solid-svg-icons";
import { NotesService } from "../../bindings/github.com/eryalito/pinthenote/internal/services";
import { Note, WindowState } from "../../bindings/github.com/eryalito/pinthenote/internal/models";
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

    return (
        <main className="note-main" style={{ backgroundColor: note.color, color: note.text_color }}>
            <div
                className="note-nav-trigger"
                onMouseEnter={() => setShowTopNav(true)}
            />

            <nav
                onMouseEnter={() => setShowTopNav(true)}
                onMouseLeave={() => !isEditing && setShowTopNav(false)}
                className={`note-nav ${isEditing || showTopNav ? "visible" : "hidden"}`}
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
                    <strong className="note-window-title">{note.title}</strong>
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
                <div className="note-footer-center">
                    <strong className="note-footer-title">Footer banner</strong>
                </div>
            </footer>

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
