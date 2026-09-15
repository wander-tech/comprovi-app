'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { getMe } from '@/lib/users';
import {
  getCategories,
  getSubcategories,
  createCategory,
  createSubcategory,
  updateCategory,
  updateSubcategory,
  deleteCategory,
  deleteSubcategory,
  type ApiError,
  type Category,
  type Subcategory,
} from '@/lib/expenses';

interface EditState {
  id: number;
  name: string;
  saving: boolean;
  error: string;
}

interface AddSubState {
  idCategory: number;
  name: string;
  saving: boolean;
  error: string;
}

const inputClass =
  'w-full px-3.5 py-2 bg-canvas border border-hairline rounded-lg text-sm text-ink placeholder-ink-subtle focus:outline-none focus:ring-2 focus:ring-primary-focus focus:border-primary-focus';

const editButtonClass =
  'text-xs font-medium text-primary bg-primary/10 hover:bg-primary/20 rounded-full px-3 py-1.5 active:scale-95 transition disabled:opacity-60';

const deleteButtonClass =
  'text-xs font-medium text-error bg-error/10 hover:bg-error/20 rounded-full px-3 py-1.5 active:scale-95 transition disabled:opacity-60';

const cancelButtonClass =
  'text-xs font-medium text-ink-muted bg-surface-1 hover:bg-surface-2 rounded-full px-3 py-1.5 active:scale-95 transition';

const errorBannerClass = 'px-4 py-3 bg-error/10 border border-error/30 text-error text-sm';

function friendlyError(err: unknown, notFoundMessage: string): string {
  const status = err instanceof Error ? (err as ApiError).status : undefined;
  if (status === 403) return 'Somente administradores podem editar itens do sistema.';
  if (status === 404) return notFoundMessage;
  return err instanceof Error ? err.message : 'Erro inesperado';
}

function LockIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 10-8 0v4h8z" />
    </svg>
  );
}

function ChevronIcon({ expanded }: { expanded: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className={`w-4 h-4 shrink-0 transition-transform ${expanded ? 'rotate-90' : ''}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  );
}

export default function CategoriesManager() {
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [expandedId, setExpandedId] = useState<number | null>(null);

  const [newCategory, setNewCategory] = useState({ name: '', saving: false, error: '' });
  const [editingCategory, setEditingCategory] = useState<EditState | null>(null);
  const [confirmDeleteCategoryId, setConfirmDeleteCategoryId] = useState<number | null>(null);
  const [deletingCategoryId, setDeletingCategoryId] = useState<number | null>(null);

  const [addSub, setAddSub] = useState<AddSubState | null>(null);
  const [editingSub, setEditingSub] = useState<EditState | null>(null);
  const [confirmDeleteSubId, setConfirmDeleteSubId] = useState<number | null>(null);
  const [deletingSubId, setDeletingSubId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [me, cats, subs] = await Promise.all([getMe(), getCategories(), getSubcategories()]);
      setCurrentUserId(me.idUser);
      setIsAdmin(me.admin);
      setCategories(cats);
      setSubcategories(subs);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar categorias');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const visibleCategories = useMemo(
    () => (isAdmin ? categories : categories.filter((c) => c.idUser !== null)),
    [categories, isAdmin],
  );

  const subsByCategory = useMemo(() => {
    const visibleSubs = isAdmin ? subcategories : subcategories.filter((s) => s.idUser !== null);
    const map = new Map<number, Subcategory[]>();
    for (const s of visibleSubs) {
      const list = map.get(s.idCategory) ?? [];
      list.push(s);
      map.set(s.idCategory, list);
    }
    return map;
  }, [subcategories, isAdmin]);

  function canManage(idUser: number | null) {
    if (idUser === currentUserId) return true;
    if (idUser === null && isAdmin) return true;
    return false;
  }

  function toggleExpand(idCategory: number) {
    setExpandedId((prev) => (prev === idCategory ? null : idCategory));
    setEditingSub(null);
    setAddSub(null);
  }

  async function handleCreateCategory(e: React.FormEvent) {
    e.preventDefault();
    const name = newCategory.name.trim();
    if (!name) return;
    setNewCategory((prev) => ({ ...prev, saving: true, error: '' }));
    try {
      const created = await createCategory(name);
      setCategories((prev) => [...prev, created]);
      setNewCategory({ name: '', saving: false, error: '' });
    } catch (err) {
      setNewCategory((prev) => ({
        ...prev,
        saving: false,
        error: err instanceof Error ? err.message : 'Erro ao criar categoria',
      }));
    }
  }

  function startEditCategory(cat: Category) {
    setEditingCategory({ id: cat.idCategory, name: cat.name, saving: false, error: '' });
  }

  async function saveEditCategory() {
    if (!editingCategory) return;
    const name = editingCategory.name.trim();
    if (!name) return;
    setEditingCategory((prev) => prev && { ...prev, saving: true, error: '' });
    try {
      const updated = await updateCategory(editingCategory.id, { name });
      setCategories((prev) => prev.map((c) => (c.idCategory === updated.idCategory ? updated : c)));
      setEditingCategory(null);
    } catch (err) {
      setEditingCategory((prev) => prev && {
        ...prev,
        saving: false,
        error: friendlyError(err, 'Categoria não encontrada.'),
      });
    }
  }

  async function handleConfirmDeleteCategory(id: number) {
    setDeletingCategoryId(id);
    setError('');
    try {
      await deleteCategory(id);
      setCategories((prev) => prev.filter((c) => c.idCategory !== id));
      setSubcategories((prev) => prev.filter((s) => s.idCategory !== id));
      if (expandedId === id) setExpandedId(null);
    } catch (err) {
      setError(friendlyError(err, 'Categoria não encontrada.'));
    } finally {
      setDeletingCategoryId(null);
      setConfirmDeleteCategoryId(null);
    }
  }

  function openAddSub(idCategory: number) {
    setAddSub({ idCategory, name: '', saving: false, error: '' });
  }

  async function submitAddSub() {
    if (!addSub) return;
    const name = addSub.name.trim();
    if (!name) return;
    setAddSub((prev) => prev && { ...prev, saving: true, error: '' });
    try {
      const created = await createSubcategory(name, addSub.idCategory);
      setSubcategories((prev) => [...prev, created]);
      setAddSub(null);
    } catch (err) {
      setAddSub((prev) => prev && {
        ...prev,
        saving: false,
        error: err instanceof Error ? err.message : 'Erro ao criar subcategoria',
      });
    }
  }

  function startEditSub(sub: Subcategory) {
    setEditingSub({ id: sub.idSubcategory, name: sub.name, saving: false, error: '' });
  }

  async function saveEditSub() {
    if (!editingSub) return;
    const name = editingSub.name.trim();
    if (!name) return;
    setEditingSub((prev) => prev && { ...prev, saving: true, error: '' });
    try {
      const updated = await updateSubcategory(editingSub.id, { name });
      setSubcategories((prev) => prev.map((s) => (s.idSubcategory === updated.idSubcategory ? updated : s)));
      setEditingSub(null);
    } catch (err) {
      setEditingSub((prev) => prev && {
        ...prev,
        saving: false,
        error: friendlyError(err, 'Subcategoria não encontrada.'),
      });
    }
  }

  async function handleConfirmDeleteSub(id: number) {
    setDeletingSubId(id);
    setError('');
    try {
      await deleteSubcategory(id);
      setSubcategories((prev) => prev.filter((s) => s.idSubcategory !== id));
    } catch (err) {
      setError(friendlyError(err, 'Subcategoria não encontrada.'));
    } finally {
      setDeletingSubId(null);
      setConfirmDeleteSubId(null);
    }
  }

  return (
    <div className="bg-canvas border border-hairline rounded-lg p-6">
      <h2 className="text-base font-semibold text-ink mb-1">Minhas categorias</h2>
      <p className="text-sm text-ink-muted mb-5">
        {isAdmin ? (
          <>
            Categorias marcadas como <span className="inline-flex items-center gap-1 align-middle"><LockIcon /> Sistema</span> são
            globais e só podem ser alteradas por administradores. As demais são pessoais e podem ser criadas, editadas ou excluídas livremente.
          </>
        ) : (
          'Crie, edite e exclua suas próprias categorias e subcategorias.'
        )}
      </p>

      {error && (
        <div className={`mb-4 ${errorBannerClass}`}>
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-24 text-ink-subtle text-sm">Carregando...</div>
      ) : (
        <>
          <ul className="divide-y divide-hairline border border-hairline rounded-lg overflow-hidden mb-6">
            {visibleCategories.length === 0 && (
              <li className="px-4 py-3 text-sm text-ink-subtle">Nenhuma categoria.</li>
            )}
            {visibleCategories.map((cat) => {
              const subs = subsByCategory.get(cat.idCategory) ?? [];
              const manageable = canManage(cat.idUser);
              const expanded = expandedId === cat.idCategory;
              const isEditing = editingCategory?.id === cat.idCategory;
              const isConfirmingDelete = confirmDeleteCategoryId === cat.idCategory;
              const isDeleting = deletingCategoryId === cat.idCategory;

              return (
                <li key={cat.idCategory} className="px-4 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => toggleExpand(cat.idCategory)}
                      className="shrink-0 text-ink-subtle hover:text-ink"
                      aria-label={expanded ? 'Recolher subcategorias' : 'Ver subcategorias'}
                    >
                      <ChevronIcon expanded={expanded} />
                    </button>

                    <div className="flex-1 min-w-0 flex items-center flex-wrap gap-2">
                      {isEditing ? (
                        <input
                          autoFocus
                          type="text"
                          value={editingCategory.name}
                          onChange={(e) => setEditingCategory((prev) => prev && { ...prev, name: e.target.value })}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') { e.preventDefault(); saveEditCategory(); }
                            else if (e.key === 'Escape') setEditingCategory(null);
                          }}
                          className={`${inputClass} flex-1 min-w-[140px]`}
                        />
                      ) : (
                        <span className="min-w-0 flex-1 text-sm text-ink truncate">{cat.name}</span>
                      )}

                      {cat.idUser === null && (
                        <span className="shrink-0 inline-flex items-center gap-1 text-xs font-medium text-ink-muted bg-surface-2 px-2 py-0.5 rounded-full">
                          <LockIcon /> Sistema
                        </span>
                      )}
                    </div>

                    {manageable && !isConfirmingDelete && (
                      isEditing ? (
                        <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end sm:justify-start">
                          <button type="button" onClick={saveEditCategory} disabled={editingCategory.saving || !editingCategory.name.trim()} className={editButtonClass}>
                            {editingCategory.saving ? 'Salvando...' : 'Salvar'}
                          </button>
                          <button type="button" onClick={() => setEditingCategory(null)} className={cancelButtonClass}>
                            Cancelar
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end sm:justify-start">
                          <button type="button" onClick={() => startEditCategory(cat)} className={editButtonClass}>
                            Editar
                          </button>
                          <button type="button" onClick={() => setConfirmDeleteCategoryId(cat.idCategory)} className={deleteButtonClass}>
                            Excluir
                          </button>
                        </div>
                      )
                    )}

                    {isConfirmingDelete && (
                      <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end sm:justify-start">
                        <span className="text-xs text-ink-muted">Excluir?</span>
                        <button type="button" disabled={isDeleting} onClick={() => handleConfirmDeleteCategory(cat.idCategory)} className={deleteButtonClass}>
                          {isDeleting ? 'Excluindo...' : 'Sim'}
                        </button>
                        <button type="button" onClick={() => setConfirmDeleteCategoryId(null)} className={cancelButtonClass}>
                          Não
                        </button>
                      </div>
                    )}
                  </div>

                  {isEditing && editingCategory.error && (
                    <p className="mt-1.5 ml-6 text-xs text-error">{editingCategory.error}</p>
                  )}

                  {expanded && (
                    <div className="mt-3 ml-3 sm:ml-6 pl-2 sm:pl-3 border-l-2 border-hairline space-y-2">
                      {subs.length === 0 && (
                        <p className="text-xs text-ink-subtle">Nenhuma subcategoria.</p>
                      )}
                      {subs.map((sub) => {
                        const subManageable = canManage(sub.idUser);
                        const subEditing = editingSub?.id === sub.idSubcategory;
                        const subConfirming = confirmDeleteSubId === sub.idSubcategory;
                        const subDeleting = deletingSubId === sub.idSubcategory;

                        return (
                          <div key={sub.idSubcategory}>
                            <div className="flex flex-wrap items-center gap-2">
                              <div className="flex-1 min-w-0 flex items-center flex-wrap gap-2">
                                {subEditing ? (
                                  <input
                                    autoFocus
                                    type="text"
                                    value={editingSub.name}
                                    onChange={(e) => setEditingSub((prev) => prev && { ...prev, name: e.target.value })}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') { e.preventDefault(); saveEditSub(); }
                                      else if (e.key === 'Escape') setEditingSub(null);
                                    }}
                                    className={`${inputClass} flex-1 min-w-[120px] py-1.5`}
                                  />
                                ) : (
                                  <span className="min-w-0 flex-1 text-sm text-ink-muted truncate">{sub.name}</span>
                                )}

                                {sub.idUser === null && (
                                  <span className="shrink-0 inline-flex items-center gap-1 text-[11px] font-medium text-ink-muted bg-surface-2 px-1.5 py-0.5 rounded-full">
                                    <LockIcon /> Sistema
                                  </span>
                                )}
                              </div>

                              {subManageable && !subConfirming && (
                                subEditing ? (
                                  <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end sm:justify-start">
                                    <button type="button" onClick={saveEditSub} disabled={editingSub.saving || !editingSub.name.trim()} className={editButtonClass}>
                                      {editingSub.saving ? 'Salvando...' : 'Salvar'}
                                    </button>
                                    <button type="button" onClick={() => setEditingSub(null)} className={cancelButtonClass}>
                                      Cancelar
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end sm:justify-start">
                                    <button type="button" onClick={() => startEditSub(sub)} className={editButtonClass}>
                                      Editar
                                    </button>
                                    <button type="button" onClick={() => setConfirmDeleteSubId(sub.idSubcategory)} className={deleteButtonClass}>
                                      Excluir
                                    </button>
                                  </div>
                                )
                              )}

                              {subConfirming && (
                                <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end sm:justify-start">
                                  <span className="text-xs text-ink-muted">Excluir?</span>
                                  <button type="button" disabled={subDeleting} onClick={() => handleConfirmDeleteSub(sub.idSubcategory)} className={deleteButtonClass}>
                                    {subDeleting ? 'Excluindo...' : 'Sim'}
                                  </button>
                                  <button type="button" onClick={() => setConfirmDeleteSubId(null)} className={cancelButtonClass}>
                                    Não
                                  </button>
                                </div>
                              )}
                            </div>
                            {subEditing && editingSub.error && (
                              <p className="mt-1 text-xs text-error">{editingSub.error}</p>
                            )}
                          </div>
                        );
                      })}

                      {addSub?.idCategory === cat.idCategory ? (
                        <div className="flex flex-col sm:flex-row sm:items-start gap-2 pt-1">
                          <div className="flex-1">
                            <input
                              autoFocus
                              type="text"
                              value={addSub.name}
                              onChange={(e) => setAddSub((prev) => prev && { ...prev, name: e.target.value })}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') { e.preventDefault(); submitAddSub(); }
                                else if (e.key === 'Escape') setAddSub(null);
                              }}
                              placeholder="Nome da subcategoria"
                              className={`${inputClass} py-1.5`}
                            />
                            {addSub.error && <p className="mt-1 text-xs text-error">{addSub.error}</p>}
                          </div>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={submitAddSub}
                              disabled={addSub.saving || !addSub.name.trim()}
                              className="px-3 py-1.5 rounded-full bg-primary text-on-primary text-xs font-medium hover:bg-primary-hover active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed transition"
                            >
                              {addSub.saving ? '...' : 'Adicionar'}
                            </button>
                            <button type="button" onClick={() => setAddSub(null)} className={cancelButtonClass}>
                              Cancelar
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => openAddSub(cat.idCategory)}
                          className="text-xs font-medium text-primary hover:underline pt-1"
                        >
                          + Nova subcategoria
                        </button>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>

          <form onSubmit={handleCreateCategory} className="border-t border-hairline pt-5">
            <h3 className="text-sm font-semibold text-ink mb-3">Nova categoria</h3>
            {newCategory.error && (
              <div className={`mb-3 ${errorBannerClass}`}>
                {newCategory.error}
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3">
              <input
                type="text"
                value={newCategory.name}
                onChange={(e) => setNewCategory((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Nome da categoria"
                className={inputClass}
              />
              <button
                type="submit"
                disabled={newCategory.saving || !newCategory.name.trim()}
                className="px-5 py-2.5 rounded-full bg-primary text-on-primary text-sm font-semibold hover:bg-primary-hover active:scale-95 focus:outline-none focus:ring-2 focus:ring-primary-focus focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed transition"
              >
                {newCategory.saving ? 'Adicionando...' : 'Adicionar'}
              </button>
            </div>
          </form>
        </>
      )}
    </div>
  );
}
