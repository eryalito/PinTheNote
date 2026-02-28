import { useEffect, useRef } from "react";
import { Category, Note } from "../../../../bindings/github.com/eryalito/pinthenote/internal/models";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEye, faSlash, faThumbtack, faTrashCan } from "@fortawesome/free-solid-svg-icons";

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
  editingCategoryID: number | null;
  editingCategoryName: string;
  savingCategoryRename: boolean;
  editingCategoryColorID: number | null;
  editingCategoryColor: string;
  savingCategoryColor: boolean;
  onStartRenameCategory: (category: Category) => void;
  onEditingCategoryNameChange: (value: string) => void;
  onCommitRenameCategory: (category: Category) => void;
  onCancelRenameCategory: () => void;
  onStartEditCategoryColor: (category: Category) => void;
  onEditingCategoryColorChange: (value: string) => void;
  onCommitCategoryColor: (category: Category, color: string) => void;
  onCancelEditCategoryColor: () => void;
  editingNoteID: number | null;
  editingNoteTitle: string;
  savingRename: boolean;
  onStartRenameNote: (note: Note) => void;
  onEditingNoteTitleChange: (value: string) => void;
  onCommitRenameNote: (note: Note) => void;
  onCancelRenameNote: () => void;
  editingNoteColorID: number | null;
  editingNoteColor: string;
  savingNoteColor: boolean;
  onStartEditNoteColor: (note: Note) => void;
  onEditingNoteColorChange: (value: string) => void;
  onCommitNoteColor: (note: Note, color: string) => void;
  onCancelEditNoteColor: () => void;
  deletingNoteID: number | null;
  onRequestDeleteNote: (note: Note) => void;
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
  editingCategoryID,
  editingCategoryName,
  savingCategoryRename,
  editingCategoryColorID,
  editingCategoryColor,
  savingCategoryColor,
  onStartRenameCategory,
  onEditingCategoryNameChange,
  onCommitRenameCategory,
  onCancelRenameCategory,
  onStartEditCategoryColor,
  onEditingCategoryColorChange,
  onCommitCategoryColor,
  onCancelEditCategoryColor,
  editingNoteID,
  editingNoteTitle,
  savingRename,
  onStartRenameNote,
  onEditingNoteTitleChange,
  onCommitRenameNote,
  onCancelRenameNote,
  editingNoteColorID,
  editingNoteColor,
  savingNoteColor,
  onStartEditNoteColor,
  onEditingNoteColorChange,
  onCommitNoteColor,
  onCancelEditNoteColor,
  deletingNoteID,
  onRequestDeleteNote,
}: CategorySectionProps) {
  const isEditingCategory = editingCategoryID === category.ID;
  const isEditingCategoryColor = editingCategoryColorID === category.ID;
  const colorInputRef = useRef<HTMLInputElement | null>(null);
  const noteColorInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isEditingCategoryColor) {
      colorInputRef.current?.click();
    }
  }, [isEditingCategoryColor]);

  useEffect(() => {
    if (editingNoteColorID !== null && notes.some((item) => item.ID === editingNoteColorID)) {
      noteColorInputRef.current?.click();
    }
  }, [editingNoteColorID, notes]);

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
        {isEditingCategoryColor ? (
          <input
            ref={colorInputRef}
            type="color"
            className="category-color-input"
            value={editingCategoryColor}
            onChange={(event) => {
              onEditingCategoryColorChange(event.target.value);
            }}
            onBlur={() => onCommitCategoryColor(category, editingCategoryColor)}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.preventDefault();
                onCancelEditCategoryColor();
              }
            }}
            onClick={(event) => {
              event.stopPropagation();
            }}
            onMouseDown={(event) => {
              event.stopPropagation();
            }}
            disabled={savingCategoryColor}
            autoFocus
          />
        ) : (
          <span
            className="category-color"
            style={{ backgroundColor: category.color }}
            aria-hidden="true"
            onDoubleClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onStartEditCategoryColor(category);
            }}
            title="Double click to edit color"
          />
        )}
        {isEditingCategory ? (
          <input
            className="category-name-input"
            value={editingCategoryName}
            onChange={(event) => onEditingCategoryNameChange(event.target.value)}
            onBlur={() => onCommitRenameCategory(category)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                onCommitRenameCategory(category);
              }
              if (event.key === "Escape") {
                event.preventDefault();
                onCancelRenameCategory();
              }
            }}
            onClick={(event) => {
              event.stopPropagation();
            }}
            onMouseDown={(event) => {
              event.stopPropagation();
            }}
            disabled={savingCategoryRename}
            autoFocus
          />
        ) : (
          <span
            className="category-name"
            onDoubleClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onStartRenameCategory(category);
            }}
            title="Double click to rename"
          >
            {category.name}
          </span>
        )}
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
              const isEditingNoteColor = editingNoteColorID === note.ID;
              const isDeletingNote = deletingNoteID === note.ID;

              return (
                <li key={note.ID} className="note-row">
                  {isEditingNoteColor ? (
                    <input
                      ref={noteColorInputRef}
                      type="color"
                      className="note-color-input"
                      value={editingNoteColor}
                      onChange={(event) => {
                        onEditingNoteColorChange(event.target.value);
                      }}
                      onBlur={() => onCommitNoteColor(note, editingNoteColor)}
                      onKeyDown={(event) => {
                        if (event.key === "Escape") {
                          event.preventDefault();
                          onCancelEditNoteColor();
                        }
                      }}
                      onClick={(event) => {
                        event.stopPropagation();
                      }}
                      onMouseDown={(event) => {
                        event.stopPropagation();
                      }}
                      disabled={savingNoteColor}
                      autoFocus
                    />
                  ) : (
                    <span
                      className="note-color"
                      style={{ backgroundColor: note.color || "#FFEBA1" }}
                      aria-hidden="true"
                      onDoubleClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        onStartEditNoteColor(note);
                      }}
                      title="Double click to edit color"
                    />
                  )}
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
                      title={isPinning ? "Updating pin" : (isPinned ? "Unpin" : "Pin")}
                      aria-label={isPinning ? "Updating pin" : (isPinned ? "Unpin" : "Pin")}
                    >
                      <span className="note-icon-stack" aria-hidden="true">
                        <FontAwesomeIcon icon={faThumbtack} />
                        {isPinned && (
                          <FontAwesomeIcon icon={faSlash} className="note-icon-slash" />
                        )}
                      </span>
                    </button>
                    <button
                      type="button"
                      className="note-display-btn"
                      disabled={isDisplaying}
                      onClick={() => onToggleNoteVisibility(note)}
                      title={isDisplaying ? "Updating visibility" : (isVisible ? "Hide" : "Display")}
                      aria-label={isDisplaying ? "Updating visibility" : (isVisible ? "Hide" : "Display")}
                    >
                      <span className="note-icon-stack" aria-hidden="true">
                        <FontAwesomeIcon icon={faEye} />
                        {isVisible && (
                          <FontAwesomeIcon icon={faSlash} className="note-icon-slash" />
                        )}
                      </span>
                    </button>
                    <button
                      type="button"
                      className="note-delete-btn"
                      disabled={isDeletingNote}
                      onClick={() => onRequestDeleteNote(note)}
                      title={isDeletingNote ? "Deleting" : "Delete note"}
                      aria-label={isDeletingNote ? "Deleting" : "Delete note"}
                    >
                      <FontAwesomeIcon icon={faTrashCan} />
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
