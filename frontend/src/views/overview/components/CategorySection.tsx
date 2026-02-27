import { Category, Note } from "../../../../bindings/github.com/eryalito/pinthenote/internal/models";

type CategorySectionProps = {
  category: Category;
  isOpen: boolean;
  notes: Note[];
  isLoadingNotes: boolean;
  isDeleting: boolean;
  isCreatingNote: boolean;
  onToggle: (categoryID: number, isOpen: boolean) => void;
  onDelete: (categoryID: number) => void;
  onCreateNote: (categoryID: number, color: string) => void;
};

export default function CategorySection({
  category,
  isOpen,
  notes,
  isLoadingNotes,
  isDeleting,
  isCreatingNote,
  onToggle,
  onDelete,
  onCreateNote,
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
            {notes.map((note) => (
              <li key={note.ID} className="note-row">
                <span className="note-title">{note.title || "Untitled note"}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </details>
  );
}
