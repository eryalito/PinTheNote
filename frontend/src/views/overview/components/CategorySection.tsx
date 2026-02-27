import { Category, Note } from "../../../../bindings/github.com/eryalito/pinthenote/internal/models";

type CategorySectionProps = {
  category: Category;
  isOpen: boolean;
  notes: Note[];
  isLoadingNotes: boolean;
  isDeleting: boolean;
  isCreatingNote: boolean;
  displayingNoteByID: Record<number, boolean>;
  pinningNoteByID: Record<number, boolean>;
  onToggle: (categoryID: number, isOpen: boolean) => void;
  onDelete: (categoryID: number) => void;
  onCreateNote: (categoryID: number, color: string) => void;
  onToggleNoteVisibility: (note: Note) => void;
  onToggleNotePin: (note: Note) => void;
  editingNoteID: number | null;
  editingNoteTitle: string;
  savingRename: boolean;
  onStartRenameNote: (note: Note) => void;
  onEditingNoteTitleChange: (value: string) => void;
  onCommitRenameNote: (note: Note) => void;
  onCancelRenameNote: () => void;
};

export default function CategorySection({
  category,
  isOpen,
  notes,
  isLoadingNotes,
  isDeleting,
  isCreatingNote,
  displayingNoteByID,
  pinningNoteByID,
  onToggle,
  onDelete,
  onCreateNote,
  onToggleNoteVisibility,
  onToggleNotePin,
  editingNoteID,
  editingNoteTitle,
  savingRename,
  onStartRenameNote,
  onEditingNoteTitleChange,
  onCommitRenameNote,
  onCancelRenameNote,
}: CategorySectionProps) {
  return (
    <details
      key={category.ID}
      open={isOpen}
      className="category-item"
      onToggle={(event) => {
        const target = event.currentTarget;
        onToggle(category.ID, target.open);
      }}
    >
      <summary className="category-summary">
        <span
          className="category-color"
          style={{ backgroundColor: category.color }}
          aria-hidden="true"
        />
        <span className="category-name">{category.name}</span>
        <div className="category-actions">
          <button
            type="button"
            className="category-create"
            disabled={isCreatingNote}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onCreateNote(category.ID, category.color);
            }}
          >
            {isCreatingNote ? "Creating..." : "New Note"}
          </button>
          <button
            type="button"
            className="category-delete"
            disabled={isDeleting}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onDelete(category.ID);
            }}
          >
            {isDeleting ? "Deleting..." : "Delete"}
          </button>
        </div>
      </summary>

      <div className="category-notes">
        {isLoadingNotes ? (
          <div className="notes-empty">Loading notes...</div>
        ) : notes.length === 0 ? (
          <div className="notes-empty">No notes in this category.</div>
        ) : (
          <ul className="notes-list">
            {notes.map((note) => {
              const isVisible = note.window_state?.visible ?? false;
              const isDisplaying = displayingNoteByID[note.ID] ?? false;
              const isPinned = note.window_state?.pinned ?? false;
              const isPinning = pinningNoteByID[note.ID] ?? false;
              const isEditing = editingNoteID === note.ID;

              return (
                <li key={note.ID} className="note-row">
                  {isEditing ? (
                    <input
                      className="note-title-input"
                      value={editingNoteTitle}
                      onChange={(event) => onEditingNoteTitleChange(event.target.value)}
                      onBlur={() => onCommitRenameNote(note)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          onCommitRenameNote(note);
                        }
                        if (event.key === "Escape") {
                          event.preventDefault();
                          onCancelRenameNote();
                        }
                      }}
                      disabled={savingRename}
                      autoFocus
                    />
                  ) : (
                    <span
                      className="note-title"
                      onDoubleClick={() => onStartRenameNote(note)}
                      title="Double click to rename"
                    >
                      {note.title || "Untitled note"}
                    </span>
                  )}
                  <div className="note-row-actions">
                    <button
                      type="button"
                      className="note-display-btn"
                      disabled={!isVisible || isPinning}
                      onClick={() => onToggleNotePin(note)}
                    >
                      {isPinning ? "Updating..." : (isPinned ? "Unpin" : "Pin")}
                    </button>
                    <button
                      type="button"
                      className="note-display-btn"
                      disabled={isDisplaying}
                      onClick={() => onToggleNoteVisibility(note)}
                    >
                      {isDisplaying ? "Updating..." : (isVisible ? "Hide" : "Display")}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </details>
  );
}
