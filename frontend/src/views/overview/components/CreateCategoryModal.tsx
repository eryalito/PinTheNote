import { FormEvent } from "react";

type CreateCategoryModalProps = {
  isOpen: boolean;
  name: string;
  color: string;
  creating: boolean;
  onNameChange: (value: string) => void;
  onColorChange: (value: string) => void;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export default function CreateCategoryModal({
  isOpen,
  name,
  color,
  creating,
  onNameChange,
  onColorChange,
  onClose,
  onSubmit,
}: CreateCategoryModalProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="Create category">
      <form className="modal" onSubmit={onSubmit}>
        <h2 className="modal-title">Create category</h2>

        <label className="modal-label" htmlFor="categoryName">Name</label>
        <input
          id="categoryName"
          className="modal-input"
          value={name}
          onChange={(event) => onNameChange(event.target.value)}
          placeholder="Category name"
          maxLength={100}
          required
        />

        <label className="modal-label" htmlFor="categoryColor">Color</label>
        <input
          id="categoryColor"
          className="modal-color"
          type="color"
          value={color}
          onChange={(event) => onColorChange(event.target.value)}
        />

        <div className="modal-actions">
          <button
            type="button"
            className="overview-button secondary"
            onClick={onClose}
            disabled={creating}
          >
            Cancel
          </button>
          <button type="submit" className="overview-button" disabled={creating}>
            {creating ? "Creating..." : "Create"}
          </button>
        </div>
      </form>
    </div>
  );
}
