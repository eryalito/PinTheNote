import { FormEvent, useEffect, useState } from "react";
import { Events } from "@wailsio/runtime";
import { NotesService } from "../../bindings/github.com/eryalito/pinthenote/internal/services";
import { Category, Note, WindowState } from "../../bindings/github.com/eryalito/pinthenote/internal/models";
import ConfirmModal from "../components/ConfirmModal";
import AboutModal from "./overview/components/AboutModal";
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
  const [editingNoteID, setEditingNoteID] = useState<number | null>(null);
  const [editingNoteTitle, setEditingNoteTitle] = useState("");
  const [savingRename, setSavingRename] = useState(false);
  const [editingNoteColorID, setEditingNoteColorID] = useState<number | null>(null);
  const [editingNoteColor, setEditingNoteColor] = useState("#FFEBA1");
  const [savingNoteColor, setSavingNoteColor] = useState(false);
  const [editingCategoryID, setEditingCategoryID] = useState<number | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState("");
  const [savingCategoryRename, setSavingCategoryRename] = useState(false);
  const [editingCategoryColorID, setEditingCategoryColorID] = useState<number | null>(null);
  const [editingCategoryColor, setEditingCategoryColor] = useState("#FFEBA1");
  const [savingCategoryColor, setSavingCategoryColor] = useState(false);
  const [deletingCategoryID, setDeletingCategoryID] = useState<number | null>(null);
  const [categoryPendingDelete, setCategoryPendingDelete] = useState<Category | null>(null);
  const [creatingNoteByCategory, setCreatingNoteByCategory] = useState<Record<number, boolean>>({});
  const [displayingNoteByID, setDisplayingNoteByID] = useState<Record<number, boolean>>({});
  const [pinningNoteByID, setPinningNoteByID] = useState<Record<number, boolean>>({});
  const [notePendingDelete, setNotePendingDelete] = useState<Note | null>(null);
  const [deletingNoteID, setDeletingNoteID] = useState<number | null>(null);
  const [showAboutModal, setShowAboutModal] = useState(false);
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

      if (!visible) {
        void (async () => {
          try {
            const existing = await NotesService.RetrieveNote(noteID);
            if (existing) {
              return;
            }

            setNotesByCategory((prev) => {
              const next: NotesByCategoryState = { ...prev };
              for (const key of Object.keys(next)) {
                const categoryID = Number(key);
                next[categoryID] = next[categoryID].filter((item) => item.ID !== noteID);
              }
              return next;
            });
          } catch {
            setNotesByCategory((prev) => {
              const next: NotesByCategoryState = { ...prev };
              for (const key of Object.keys(next)) {
                const categoryID = Number(key);
                next[categoryID] = next[categoryID].filter((item) => item.ID !== noteID);
              }
              return next;
            });
          }
        })();
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    const unsubscribe = Events.On("note:pin-changed", (event: any) => {
      const payload = event?.data;
      const noteID = Number(payload?.noteId);
      const pinned = payload?.pinned === true;

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
                pinned,
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

  useEffect(() => {
    const unsubscribe = Events.On("note:updated", (event: any) => {
      const payload = event?.data;
      const noteID = Number(payload?.noteId);

      if (!Number.isFinite(noteID)) {
        return;
      }

      void (async () => {
        try {
          const updatedNote = await NotesService.RetrieveNote(noteID);

          if (!updatedNote) {
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
                  title: updatedNote.title,
                  content: updatedNote.content,
                  color: updatedNote.color,
                  text_color: updatedNote.text_color,
                });
              });
            }

            return next;
          });
        } catch {
          setNotesByCategory((prev) => {
            const next: NotesByCategoryState = { ...prev };

            for (const key of Object.keys(next)) {
              const categoryID = Number(key);
              next[categoryID] = next[categoryID].filter((item) => item.ID !== noteID);
            }

            return next;
          });
        }
      })();
    });

    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    const unsubscribe = Events.On("note:deleted", (event: any) => {
      const payload = event?.data;
      const noteID = Number(payload?.noteId);

      if (!Number.isFinite(noteID)) {
        return;
      }

      setNotesByCategory((prev) => {
        const next: NotesByCategoryState = { ...prev };

        for (const key of Object.keys(next)) {
          const categoryID = Number(key);
          next[categoryID] = next[categoryID].filter((item) => item.ID !== noteID);
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

  const onRequestDeleteCategory = (category: Category) => {
    setCategoryPendingDelete(category);
  };

  const onCancelDeleteCategory = () => {
    if (deletingCategoryID !== null) {
      return;
    }

    setCategoryPendingDelete(null);
  };

  const onConfirmDeleteCategory = async () => {
    if (!categoryPendingDelete) {
      return;
    }

    const categoryID = categoryPendingDelete.ID;
    await onDeleteCategory(categoryID);
    setCategoryPendingDelete(null);
  };

  const onStartRenameCategory = (category: Category) => {
    setEditingCategoryID(category.ID);
    setEditingCategoryName(category.name ?? "");
  };

  const onCancelRenameCategory = () => {
    if (savingCategoryRename) {
      return;
    }

    setEditingCategoryID(null);
    setEditingCategoryName("");
  };

  const onCommitRenameCategory = async (category: Category) => {
    if (savingCategoryRename || editingCategoryID !== category.ID) {
      return;
    }

    const currentName = category.name ?? "";
    const nextName = editingCategoryName.trim();

    if (!nextName || nextName === currentName) {
      setEditingCategoryID(null);
      setEditingCategoryName("");
      return;
    }

    try {
      setError(null);
      setSavingCategoryRename(true);
      const updatedCategory = new Category({ ...category, name: nextName });
      await NotesService.UpdateCategory(updatedCategory);

      setCategories((prev) =>
        prev.map((item) => {
          if (item.ID !== category.ID) {
            return item;
          }

          return new Category({ ...item, name: nextName });
        }),
      );

      setEditingCategoryID(null);
      setEditingCategoryName("");
    } catch {
      setError("Failed to update category name.");
    } finally {
      setSavingCategoryRename(false);
    }
  };

  const onStartEditCategoryColor = (category: Category) => {
    setEditingCategoryColorID(category.ID);
    setEditingCategoryColor(category.color || "#FFEBA1");
  };

  const onCancelEditCategoryColor = () => {
    if (savingCategoryColor) {
      return;
    }

    setEditingCategoryColorID(null);
    setEditingCategoryColor("#FFEBA1");
  };

  const onCommitCategoryColor = async (category: Category, nextColor: string) => {
    if (savingCategoryColor || editingCategoryColorID !== category.ID) {
      return;
    }

    const currentColor = category.color || "#FFEBA1";
    if (!nextColor || nextColor === currentColor) {
      setEditingCategoryColorID(null);
      setEditingCategoryColor("#FFEBA1");
      return;
    }

    try {
      setError(null);
      setSavingCategoryColor(true);
      const updatedCategory = new Category({ ...category, color: nextColor });
      await NotesService.UpdateCategory(updatedCategory);

      setCategories((prev) =>
        prev.map((item) => {
          if (item.ID !== category.ID) {
            return item;
          }

          return new Category({ ...item, color: nextColor });
        }),
      );

      setEditingCategoryColorID(null);
      setEditingCategoryColor("#FFEBA1");
    } catch {
      setError("Failed to update category color.");
    } finally {
      setSavingCategoryColor(false);
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

  const onToggleNotePin = async (note: Note) => {
    try {
      setError(null);
      setPinningNoteByID((prev) => ({ ...prev, [note.ID]: true }));
      await Events.Emit("note:window-action", {
        action: "pin",
        noteId: note.ID,
      });
    } catch {
      setError("Failed to update note pin state.");
    } finally {
      setPinningNoteByID((prev) => ({ ...prev, [note.ID]: false }));
    }
  };

  const onStartRenameNote = (note: Note) => {
    setEditingNoteID(note.ID);
    setEditingNoteTitle(note.title ?? "");
  };

  const onCancelRenameNote = () => {
    if (savingRename) {
      return;
    }
    setEditingNoteID(null);
    setEditingNoteTitle("");
  };

  const onCommitRenameNote = async (note: Note) => {
    if (savingRename || editingNoteID !== note.ID) {
      return;
    }

    const currentTitle = note.title ?? "";
    const nextTitle = editingNoteTitle.trim();
    if (!nextTitle || nextTitle === currentTitle) {
      setEditingNoteID(null);
      return;
    }

    try {
      setError(null);
      setSavingRename(true);
      const latestNote = await NotesService.RetrieveNote(note.ID);
      if (!latestNote) {
        throw new Error("Note not found");
      }

      const updatedNote = new Note({ ...latestNote, title: nextTitle });
      await NotesService.UpdateNote(updatedNote);
      await Events.Emit("note:updated", { noteId: note.ID });

      setNotesByCategory((prev) => {
        const next: NotesByCategoryState = { ...prev };
        for (const key of Object.keys(next)) {
          const categoryID = Number(key);
          next[categoryID] = next[categoryID].map((item) => {
            if (item.ID !== note.ID) {
              return item;
            }
            return new Note({ ...item, title: nextTitle });
          });
        }
        return next;
      });

      setEditingNoteID(null);
      setEditingNoteTitle("");
    } catch {
      setError("Failed to update note title.");
    } finally {
      setSavingRename(false);
    }
  };

  const onStartEditNoteColor = (note: Note) => {
    setEditingNoteColorID(note.ID);
    setEditingNoteColor(note.color || "#FFEBA1");
  };

  const onCancelEditNoteColor = () => {
    if (savingNoteColor) {
      return;
    }

    setEditingNoteColorID(null);
    setEditingNoteColor("#FFEBA1");
  };

  const onCommitNoteColor = async (note: Note, nextColor: string) => {
    if (savingNoteColor || editingNoteColorID !== note.ID) {
      return;
    }

    const currentColor = note.color || "#FFEBA1";
    if (!nextColor || nextColor === currentColor) {
      setEditingNoteColorID(null);
      setEditingNoteColor("#FFEBA1");
      return;
    }

    try {
      setError(null);
      setSavingNoteColor(true);
      const latestNote = await NotesService.RetrieveNote(note.ID);
      if (!latestNote) {
        throw new Error("Note not found");
      }

      const updatedNote = new Note({ ...latestNote, color: nextColor });
      await NotesService.UpdateNote(updatedNote);
      await Events.Emit("note:updated", { noteId: note.ID });

      setNotesByCategory((prev) => {
        const next: NotesByCategoryState = { ...prev };
        for (const key of Object.keys(next)) {
          const categoryID = Number(key);
          next[categoryID] = next[categoryID].map((item) => {
            if (item.ID !== note.ID) {
              return item;
            }
            return new Note({ ...item, color: nextColor });
          });
        }
        return next;
      });

      setEditingNoteColorID(null);
      setEditingNoteColor("#FFEBA1");
    } catch {
      setError("Failed to update note color.");
    } finally {
      setSavingNoteColor(false);
    }
  };

  const onRequestDeleteNote = (note: Note) => {
    setNotePendingDelete(note);
  };

  const onCancelDeleteNote = () => {
    if (deletingNoteID !== null) {
      return;
    }

    setNotePendingDelete(null);
  };

  const onConfirmDeleteNote = async () => {
    const note = notePendingDelete;
    if (!note) {
      return;
    }

    try {
      setError(null);
      setDeletingNoteID(note.ID);

      await Events.Emit("note:window-action", {
        action: "close",
        noteId: note.ID,
      });

      await NotesService.DeleteNote(note.ID);
      await Events.Emit("note:deleted", { noteId: note.ID });

      setNotesByCategory((prev) => {
        const next: NotesByCategoryState = { ...prev };
        for (const key of Object.keys(next)) {
          const categoryID = Number(key);
          next[categoryID] = next[categoryID].filter((item) => item.ID !== note.ID);
        }
        return next;
      });

      if (editingNoteID === note.ID) {
        setEditingNoteID(null);
        setEditingNoteTitle("");
      }

      if (editingNoteColorID === note.ID) {
        setEditingNoteColorID(null);
        setEditingNoteColor("#FFEBA1");
      }

      setNotePendingDelete(null);
    } catch {
      setError("Failed to delete note.");
    } finally {
      setDeletingNoteID(null);
    }
  };

  return (
    <main className="overview-main">
      <header className="overview-header">
        <h1 className="overview-title">Categories</h1>
        <button
          type="button"
          className="overview-button overview-create-category-btn"
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
                pinningNoteByID={pinningNoteByID}
                onToggle={(categoryID, isNowOpen) => {
                  void onToggleCategory(categoryID, isNowOpen);
                }}
                onDelete={(categoryToDelete) => {
                  onRequestDeleteCategory(categoryToDelete);
                }}
                onCreateNote={(categoryID, color) => {
                  void onCreateNoteInCategory(categoryID, color);
                }}
                onToggleNoteVisibility={(noteToDisplay) => {
                  void onToggleNoteVisibility(noteToDisplay);
                }}
                onToggleNotePin={(noteToPin) => {
                  void onToggleNotePin(noteToPin);
                }}
                editingCategoryID={editingCategoryID}
                editingCategoryName={editingCategoryName}
                savingCategoryRename={savingCategoryRename}
                editingCategoryColorID={editingCategoryColorID}
                editingCategoryColor={editingCategoryColor}
                savingCategoryColor={savingCategoryColor}
                onStartRenameCategory={(categoryToRename) => {
                  onStartRenameCategory(categoryToRename);
                }}
                onEditingCategoryNameChange={setEditingCategoryName}
                onCommitRenameCategory={(categoryToRename) => {
                  void onCommitRenameCategory(categoryToRename);
                }}
                onCancelRenameCategory={onCancelRenameCategory}
                onStartEditCategoryColor={(categoryToEdit) => {
                  onStartEditCategoryColor(categoryToEdit);
                }}
                onEditingCategoryColorChange={setEditingCategoryColor}
                onCommitCategoryColor={(categoryToEdit, nextColor) => {
                  void onCommitCategoryColor(categoryToEdit, nextColor);
                }}
                onCancelEditCategoryColor={onCancelEditCategoryColor}
                editingNoteID={editingNoteID}
                editingNoteTitle={editingNoteTitle}
                savingRename={savingRename}
                onStartRenameNote={(noteToRename) => {
                  onStartRenameNote(noteToRename);
                }}
                onEditingNoteTitleChange={setEditingNoteTitle}
                onCommitRenameNote={(noteToRename) => {
                  void onCommitRenameNote(noteToRename);
                }}
                onCancelRenameNote={onCancelRenameNote}
                editingNoteColorID={editingNoteColorID}
                editingNoteColor={editingNoteColor}
                savingNoteColor={savingNoteColor}
                onStartEditNoteColor={(noteToEdit) => {
                  onStartEditNoteColor(noteToEdit);
                }}
                onEditingNoteColorChange={setEditingNoteColor}
                onCommitNoteColor={(noteToEdit, nextColor) => {
                  void onCommitNoteColor(noteToEdit, nextColor);
                }}
                onCancelEditNoteColor={onCancelEditNoteColor}
                deletingNoteID={deletingNoteID}
                onRequestDeleteNote={onRequestDeleteNote}
              />
            );
          })
        )}
      </section>

      <div className="overview-meta">
        <button type="button" className="overview-link-button" onClick={() => setShowAboutModal(true)}>
          About
        </button>
      </div>

      <ConfirmModal
        isOpen={notePendingDelete !== null}
        title="Delete note?"
        message={
          <>
            This will permanently delete <strong>{notePendingDelete?.title || "Untitled note"}</strong>.
          </>
        }
        confirmLabel={
          notePendingDelete && deletingNoteID === notePendingDelete.ID ? "Deleting..." : "Delete"
        }
        confirmDisabled={notePendingDelete !== null && deletingNoteID === notePendingDelete.ID}
        onCancel={onCancelDeleteNote}
        onConfirm={() => {
          void onConfirmDeleteNote();
        }}
      />

      <ConfirmModal
        isOpen={categoryPendingDelete !== null}
        title="Delete category?"
        message={
          <>
            This will permanently delete <strong>{categoryPendingDelete?.name}</strong> and all notes in this category.
          </>
        }
        confirmLabel={
          categoryPendingDelete && deletingCategoryID === categoryPendingDelete.ID ? "Deleting..." : "Delete"
        }
        confirmDisabled={categoryPendingDelete !== null && deletingCategoryID === categoryPendingDelete.ID}
        onCancel={onCancelDeleteCategory}
        onConfirm={() => {
          void onConfirmDeleteCategory();
        }}
      />

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

      <AboutModal isOpen={showAboutModal} onClose={() => setShowAboutModal(false)} />
    </main>
  );
}

export default OverviewView;
