import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Events } from "@wailsio/runtime";
import { marked } from "marked";
import { NotesService } from "../../bindings/github.com/eryalito/pinthenote/internal/services";
import { Note } from "../../bindings/github.com/eryalito/pinthenote/internal/models";
import "./NoteView.css";

export default function NoteView() {
    const { id } = useParams<{ id: string }>();
    const [note, setNote] = useState<Note | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showNav, setShowNav] = useState(false);
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

        return () => {
            cancelled = true;
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
        <main className="note-main">
            <div
                className="note-nav-trigger"
                onMouseEnter={() => setShowNav(true)}
            />

            <nav
                onMouseEnter={() => setShowNav(true)}
                onMouseLeave={() => !isEditing && setShowNav(false)}
                className={`note-nav ${isEditing || showNav ? "visible" : "hidden"}`}
            >
                <button
                    onClick={() => emitWindowAction("pin")}
                    className="note-nav-button"
                    title="Pin"
                    aria-label="Pin"
                >
                    📌
                </button>

                <div className="note-nav-center">
                    <strong className="note-title">{note.title}</strong>
                    <button
                        onClick={() => {
                            void toggleEditMode();
                        }}
                        className="note-nav-action-btn"
                        title={isEditing ? "Cancel" : "Edit"}
                        aria-label={isEditing ? "Cancel" : "Edit"}
                    >
                        {isEditing ? "Cancel" : "Edit"}
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
                </div>

                <button
                    onClick={() => emitWindowAction("close")}
                    className="note-nav-button"
                    title="Close"
                    aria-label="Close"
                >
                    ✕
                </button>
            </nav>

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
