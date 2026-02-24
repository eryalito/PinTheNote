import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Events } from "@wailsio/runtime";
import { marked } from "marked";
import { NotesService } from "../../bindings/github.com/eryalito/pinthenote/internal/services";
import { Note } from "../../bindings/github.com/eryalito/pinthenote/internal/models";

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
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
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
    <main style={{ height: "100vh", position: "relative", overflow: "hidden" }}>
      <div
        style={{
          position: "fixed",
          top: 0,
          left: "6px",
          right: "6px",
          height: "12px",
          zIndex: 100,
        }}
        onMouseEnter={() => setShowNav(true)}
      />

      <nav
        onMouseEnter={() => setShowNav(true)}
        onMouseLeave={() => !isEditing && setShowNav(false)}
        style={{
          position: "fixed",
          top: "6px",
          left: "6px",
          right: "6px",
          height: "44px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 12px",
          background: "rgba(27, 38, 54, 0.88)",
          backdropFilter: "blur(8px)",
          borderBottom: "1px solid rgba(255, 255, 255, 0.12)",
          borderRadius: "8px",
          transform: isEditing || showNav ? "translateY(0)" : "translateY(-100%)",
          transition: "transform 160ms ease",
          zIndex: 101,
          "--wails-draggable": "drag",
        } as any}
      >
        <button
          onClick={() => emitWindowAction("pin")}
          style={{
            width: "30px",
            height: "30px",
            margin: 0,
            padding: 0,
            borderRadius: "6px",
            border: "1px solid rgba(255, 255, 255, 0.2)",
            background: "rgba(255, 255, 255, 0.08)",
            color: "inherit",
            cursor: "pointer",
            "--wails-draggable": "none",
          } as any}
          title="Pin"
          aria-label="Pin"
        >
          📌
        </button>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            "--wails-draggable": "none",
          } as any}
        >
          <strong style={{ fontSize: "0.9rem" }}>{note.title}</strong>
          <button
            onClick={() => {
              void toggleEditMode();
            }}
            style={{
              width: "70px",
              height: "30px",
              margin: 0,
              padding: "0 8px",
              borderRadius: "6px",
              border: "1px solid rgba(255, 255, 255, 0.2)",
              background: "rgba(255, 255, 255, 0.08)",
              color: "inherit",
              cursor: "pointer",
              "--wails-draggable": "none",
            } as any}
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
              style={{
                width: "70px",
                height: "30px",
                margin: 0,
                padding: "0 8px",
                borderRadius: "6px",
                border: "1px solid rgba(255, 255, 255, 0.2)",
                background: "rgba(255, 255, 255, 0.08)",
                color: "inherit",
                cursor: saving ? "default" : "pointer",
                opacity: saving ? 0.7 : 1,
                "--wails-draggable": "none",
              } as any}
              title="Save"
              aria-label="Save"
            >
              {saving ? "Saving" : "Save"}
            </button>
          )}
        </div>

        <button
          onClick={() => emitWindowAction("close")}
          style={{
            width: "30px",
            height: "30px",
            margin: 0,
            padding: 0,
            borderRadius: "6px",
            border: "1px solid rgba(255, 255, 255, 0.2)",
            background: "rgba(255, 255, 255, 0.08)",
            color: "inherit",
            cursor: "pointer",
            "--wails-draggable": "none",
          } as any}
          title="Close"
          aria-label="Close"
        >
          ✕
        </button>
      </nav>

      <div
        style={{
          height: "100%",
          overflowY: isEditing ? "hidden" : "auto",
          boxSizing: "border-box",
          padding: isEditing ? "8px" : "2rem",
          paddingTop: "50px",
          width: "100%",
        }}
      >
        {isEditing ? (
          <textarea
            value={draftContent}
            onChange={(event) => setDraftContent(event.target.value)}
            style={{
              width: "100%",
              height: "100%",
              boxSizing: "border-box",
              borderRadius: "8px",
              border: "1px solid rgba(255, 255, 255, 0.2)",
              background: "rgba(255, 255, 255, 0.06)",
              color: "inherit",
              padding: "12px",
              resize: "none",
            }}
          />
        ) : (
          <div
            dangerouslySetInnerHTML={{ __html: marked(note.content ?? "") }}
          />
        )}
      </div>
    </main>
  );
}
