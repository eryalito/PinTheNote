import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Events } from "@wailsio/runtime";
import { NotesService } from "../../bindings/github.com/eryalito/pinthenote/internal/services";
import { Note } from "../../bindings/github.com/eryalito/pinthenote/internal/models";

export default function NoteView() {
  const { id } = useParams<{ id: string }>();
  const [note, setNote] = useState<Note | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNav, setShowNav] = useState(false);

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

  return (
    <main style={{ minHeight: "100vh", position: "relative", padding: "2rem" }}>
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          height: "12px",
          zIndex: 100,
        }}
        onMouseEnter={() => setShowNav(true)}
      />

      <nav
        onMouseEnter={() => setShowNav(true)}
        onMouseLeave={() => setShowNav(false)}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          height: "44px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 12px",
          background: "rgba(27, 38, 54, 0.88)",
          backdropFilter: "blur(8px)",
          borderBottom: "1px solid rgba(255, 255, 255, 0.12)",
          transform: showNav ? "translateY(0)" : "translateY(-100%)",
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

        <strong style={{ fontSize: "0.9rem" }}>{note.title}</strong>

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

      <h1 style={{ marginTop: "2.5rem" }}>{note.title}</h1>
      <p>{note.content}</p>
    </main>
  );
}
