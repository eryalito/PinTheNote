import { FormEvent, useEffect, useState } from "react";
import { Events } from "@wailsio/runtime";
import { NotesService } from "../../bindings/github.com/eryalito/pinthenote/internal/services";
import { Category, Note, WindowState } from "../../bindings/github.com/eryalito/pinthenote/internal/models";
import CategorySection from "./overview/components/CategorySection";
import CreateCategoryModal from "./overview/components/CreateCategoryModal";
import "./OverviewView.css";

type NotesByCategoryState = Record<number, Note[]>;
type LoadingByCategoryState = Record<number, boolean>;

function OverviewView() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryColor, setNewCategoryColor] = useState("#FFEBA1");
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [deletingCategoryID, setDeletingCategoryID] = useState<number | null>(null);
  const [creatingNoteByCategory, setCreatingNoteByCategory] = useState<Record<number, boolean>>({});
  const [displayingNoteByID, setDisplayingNoteByID] = useState<Record<number, boolean>>({});
  const [openCategories, setOpenCategories] = useState<Record<number, boolean>>({});
  const [notesByCategory, setNotesByCategory] = useState<NotesByCategoryState>({});
  const [loadingNotesByCategory, setLoadingNotesByCategory] = useState<LoadingByCategoryState>({});

  const loadCategories = async () => {
    try {
      setLoadingCategories(true);
      setError(null);
      const result = await NotesService.RetrieveCategories();
      setCategories(result ?? []);
    } catch {
      setError("Failed to load categories.");
    } finally {
      setLoadingCategories(false);
    }
  };

  useEffect(() => {
    void loadCategories();
  }, []);

  useEffect(() => {
    const unsubscribe = Events.On("note:visibility-changed", (event: any) => {
      const payload = event?.data;
      const noteID = Number(payload?.noteId);
      const visible = payload?.visible === true;

      if (!Number.isFinite(noteID)) {
        return;
      }

      setNotesByCategory((prev) => {
        const next: NotesByCategoryState = { ...prev };

        for (const key of Object.keys(next)) {
          const categoryID = Number(key);
          next[categoryID] = next[categoryID].map((item) => {
            if (item.ID !== noteID) {
              return item;
            }

            return new Note({
              ...item,
              window_state: new WindowState({
                ...(item.window_state ?? {}),
                note_id: item.ID,
                visible,
              }),
            });
          });
        }

        return next;
      });
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const loadNotesForCategory = async (categoryID: number) => {
    if (loadingNotesByCategory[categoryID]) {
      return;
    }

    try {
      setLoadingNotesByCategory((prev) => ({ ...prev, [categoryID]: true }));
      const notes = await NotesService.RetrieveNotesByCategory(categoryID);
      setNotesByCategory((prev) => ({ ...prev, [categoryID]: notes ?? [] }));
    } catch {
      setError("Failed to load notes for category.");
    } finally {
      setLoadingNotesByCategory((prev) => ({ ...prev, [categoryID]: false }));
    }
  };

  const onToggleCategory = async (categoryID: number, isOpen: boolean) => {
    setOpenCategories((prev) => ({ ...prev, [categoryID]: isOpen }));

    if (isOpen && notesByCategory[categoryID] === undefined) {
      await loadNotesForCategory(categoryID);
    }
  };

  const onSubmitCreateCategory = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedName = newCategoryName.trim();
    if (!trimmedName) {
      setError("Category name is required.");
      return;
    }

    try {
      setCreatingCategory(true);
      setError(null);
      await NotesService.CreateCategory(trimmedName, newCategoryColor);

      setNewCategoryName("");
      setNewCategoryColor("#FFEBA1");
      setShowCreateModal(false);
      await loadCategories();
    } catch {
      setError("Failed to create category.");
    } finally {
      setCreatingCategory(false);
    }
  };

  const onDeleteCategory = async (categoryID: number) => {
    try {
      setDeletingCategoryID(categoryID);
      setError(null);
      await NotesService.DeleteCategory(categoryID);
      await loadCategories();
      setOpenCategories((prev) => ({ ...prev, [categoryID]: false }));
    } catch {
      setError("Failed to delete category.");
    } finally {
      setDeletingCategoryID(null);
    }
  };

  const onCreateNoteInCategory = async (categoryID: number, color: string) => {
    try {
      setError(null);
      setCreatingNoteByCategory((prev) => ({ ...prev, [categoryID]: true }));
      const createdNote = await NotesService.CreateNoteInCategory(categoryID, color);
      if (createdNote) {
        await Events.Emit("note:window-action", {
          action: "show",
          noteId: createdNote.ID,
        });
      }
      setOpenCategories((prev) => ({ ...prev, [categoryID]: true }));
      await loadNotesForCategory(categoryID);
    } catch {
      setError("Failed to create note.");
    } finally {
      setCreatingNoteByCategory((prev) => ({ ...prev, [categoryID]: false }));
    }
  };

  const onToggleNoteVisibility = async (note: Note) => {
    try {
      setError(null);
      setDisplayingNoteByID((prev) => ({ ...prev, [note.ID]: true }));
      const isVisible = note.window_state?.visible === true;
      await Events.Emit("note:window-action", {
        action: isVisible ? "close" : "show",
        noteId: note.ID,
      });
    } catch {
      setError("Failed to update note visibility.");
    } finally {
      setDisplayingNoteByID((prev) => ({ ...prev, [note.ID]: false }));
    }
  };

  return (
    <main className="overview-main">
      <header className="overview-header">
        <h1 className="overview-title">Categories</h1>
        <button
          type="button"
          className="overview-button"
          onClick={() => setShowCreateModal(true)}
        >
          New Category
        </button>
      </header>

      {error && <div className="overview-error">{error}</div>}

      <section className="overview-list" aria-label="Category list">
        {loadingCategories ? (
          <div className="overview-empty">Loading categories...</div>
        ) : categories.length === 0 ? (
          <div className="overview-empty">No categories yet.</div>
        ) : (
          categories.map((category) => {
            const isOpen = openCategories[category.ID] ?? false;
            const notes = notesByCategory[category.ID] ?? [];
            const isLoadingNotes = loadingNotesByCategory[category.ID] ?? false;
            const isDeleting = deletingCategoryID === category.ID;
            const isCreatingNote = creatingNoteByCategory[category.ID] ?? false;

            return (
              <CategorySection
                key={category.ID}
                category={category}
                isOpen={isOpen}
                notes={notes}
                isLoadingNotes={isLoadingNotes}
                isDeleting={isDeleting}
                isCreatingNote={isCreatingNote}
                displayingNoteByID={displayingNoteByID}
                onToggle={(categoryID, isNowOpen) => {
                  void onToggleCategory(categoryID, isNowOpen);
                }}
                onDelete={(categoryID) => {
                  void onDeleteCategory(categoryID);
                }}
                onCreateNote={(categoryID, color) => {
                  void onCreateNoteInCategory(categoryID, color);
                }}
                onToggleNoteVisibility={(noteToDisplay) => {
                  void onToggleNoteVisibility(noteToDisplay);
                }}
              />
            );
          })
        )}
      </section>

      <CreateCategoryModal
        isOpen={showCreateModal}
        name={newCategoryName}
        color={newCategoryColor}
        creating={creatingCategory}
        onNameChange={setNewCategoryName}
        onColorChange={setNewCategoryColor}
        onClose={() => setShowCreateModal(false)}
        onSubmit={onSubmitCreateCategory}
      />
    </main>
  );
}

export default OverviewView;
