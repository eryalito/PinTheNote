import { FormEvent } from "react";

type RenameNoteModalProps = {
  isOpen: boolean;
  title: string;
  saving: boolean;
  onTitleChange: (value: string) => void;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export default function RenameNoteModal({
  isOpen,
  title,
  saving,
  onTitleChange,
  onClose,
  onSubmit,
}: RenameNoteModalProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="Rename note">
      <form className="modal" onSubmit={onSubmit}>
        <h2 className="modal-title">Rename note</h2>

        <label className="modal-label" htmlFor="noteTitle">Title</label>
        <input
          id="noteTitle"
          className="modal-input"
          value={title}
          onChange={(event) => onTitleChange(event.target.value)}
          placeholder="Note title"
          maxLength={255}
          required
          autoFocus
        />

        <div className="modal-actions">
          <button
            type="button"
            className="overview-button secondary"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </button>
          <button type="submit" className="overview-button" disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </form>
    </div>
  );
}
