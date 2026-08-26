'use client';

import { useEffect, useState, useCallback } from 'react';
import { getUsers, createUser, updateUser, deleteUser, type User, type UpdateUserPayload } from '@/lib/users';

const EMPTY_CREATE_FORM = { name: '', email: '', password: '', confirmPassword: '', phone: '', cpf: '' };

interface CreateState {
  form: typeof EMPTY_CREATE_FORM;
  saving: boolean;
  error: string;
}

interface EditState {
  user: User;
  form: { name: string; email: string; phone: string; cpf: string; password: string };
  saving: boolean;
  error: string;
}

const EMPTY_FILTERS = { name: '', email: '', cpf: '', phone: '' };

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [editState, setEditState] = useState<EditState | null>(null);
  const [createState, setCreateState] = useState<CreateState | null>(null);

  const fetchUsers = useCallback(async (f = EMPTY_FILTERS) => {
    setLoading(true);
    setError('');
    try {
      const data = await getUsers({
        name: f.name || undefined,
        email: f.email || undefined,
        cpf: f.cpf || undefined,
        phone: f.phone || undefined,
      });
      setUsers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar usuários');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  function updateFilter(field: keyof typeof filters) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setFilters((prev) => ({ ...prev, [field]: e.target.value }));
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    fetchUsers(filters);
  }

  function handleClear() {
    setFilters(EMPTY_FILTERS);
    fetchUsers(EMPTY_FILTERS);
  }

  async function handleDelete(id: number) {
    setDeleting(id);
    try {
      await deleteUser(String(id));
      setUsers((prev) => prev.filter((u) => u.idUser !== id));
      setConfirmDelete(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao excluir usuário');
    } finally {
      setDeleting(null);
    }
  }

  function openCreate() {
    setCreateState({ form: EMPTY_CREATE_FORM, saving: false, error: '' });
  }

  function updateCreateField(field: keyof typeof EMPTY_CREATE_FORM) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setCreateState((prev) =>
        prev ? { ...prev, form: { ...prev.form, [field]: e.target.value } } : prev,
      );
  }

  function updateCreateCpf(e: React.ChangeEvent<HTMLInputElement>) {
    const digitsOnly = e.target.value.replace(/\D/g, '').slice(0, 11);
    setCreateState((prev) => (prev ? { ...prev, form: { ...prev.form, cpf: digitsOnly } } : prev));
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!createState) return;
    const { name, email, password, confirmPassword, phone, cpf } = createState.form;
    if (password !== confirmPassword) {
      setCreateState((prev) => prev && { ...prev, error: 'As senhas não coincidem.' });
      return;
    }
    if (password.length < 6) {
      setCreateState((prev) => prev && { ...prev, error: 'A senha deve ter no mínimo 6 caracteres.' });
      return;
    }
    setCreateState((prev) => prev && { ...prev, saving: true, error: '' });
    try {
      const created = await createUser({
        name,
        email,
        password,
        phone: phone || undefined,
        cpf: cpf || undefined,
      });
      setUsers((prev) => [created, ...prev]);
      setCreateState(null);
    } catch (err) {
      setCreateState((prev) =>
        prev && { ...prev, saving: false, error: err instanceof Error ? err.message : 'Erro ao cadastrar' },
      );
    }
  }

  function openEdit(user: User) {
    setEditState({
      user,
      form: {
        name: user.name,
        email: user.email,
        phone: user.phone ?? '',
        cpf: user.cpf ?? '',
        password: '',
      },
      saving: false,
      error: '',
    });
  }

  function updateEditField(field: keyof EditState['form']) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setEditState((prev) =>
        prev ? { ...prev, form: { ...prev.form, [field]: e.target.value } } : prev,
      );
  }

  function updateEditCpf(e: React.ChangeEvent<HTMLInputElement>) {
    const digitsOnly = e.target.value.replace(/\D/g, '').slice(0, 11);
    setEditState((prev) => (prev ? { ...prev, form: { ...prev.form, cpf: digitsOnly } } : prev));
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editState) return;
    setEditState((prev) => prev && { ...prev, saving: true, error: '' });
    try {
      const payload: UpdateUserPayload = {
        name: editState.form.name,
        email: editState.form.email,
        phone: editState.form.phone || undefined,
        cpf: editState.form.cpf || undefined,
      };
      if (editState.form.password) payload.password = editState.form.password;
      const updated = await updateUser(String(editState.user.idUser), payload);
      setUsers((prev) => prev.map((u) => (u.idUser === updated.idUser ? updated : u)));
      setEditState(null);
    } catch (err) {
      setEditState((prev) =>
        prev && {
          ...prev,
          saving: false,
          error: err instanceof Error ? err.message : 'Erro ao salvar',
        },
      );
    }
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('pt-BR');
  }

  function getInitials(name: string) {
    return name.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase();
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-brand-fg">Usuários</h1>
          <p className="text-sm text-gray-500 mt-1 dark:text-brand-muted">Gerencie os usuários do sistema</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-primary text-white text-sm font-semibold rounded-lg hover:bg-brand-primary/90 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:ring-offset-2 transition-colors whitespace-nowrap"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Novo usuário
        </button>
      </div>

      {/* Filters */}
      <form
        onSubmit={handleSearch}
        className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-6 dark:border-brand-muted/20 dark:bg-brand-surface"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide dark:text-brand-muted">
              Nome
            </label>
            <input
              type="text"
              value={filters.name}
              onChange={updateFilter('name')}
              placeholder="Buscar por nome"
              className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent dark:placeholder-brand-muted dark:border-brand-muted/30 dark:text-brand-fg"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide dark:text-brand-muted">
              E-mail
            </label>
            <input
              type="text"
              value={filters.email}
              onChange={updateFilter('email')}
              placeholder="Buscar por e-mail"
              className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent dark:placeholder-brand-muted dark:border-brand-muted/30 dark:text-brand-fg"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide dark:text-brand-muted">
              CPF
            </label>
            <input
              type="text"
              value={filters.cpf}
              onChange={updateFilter('cpf')}
              placeholder="Buscar por CPF"
              maxLength={11}
              className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent dark:placeholder-brand-muted dark:border-brand-muted/30 dark:text-brand-fg"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide dark:text-brand-muted">
              Telefone
            </label>
            <input
              type="text"
              value={filters.phone}
              onChange={updateFilter('phone')}
              placeholder="Ex: 11987654321"
              className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent dark:placeholder-brand-muted dark:border-brand-muted/30 dark:text-brand-fg"
            />
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <button
            type="submit"
            className="px-5 py-2 bg-brand-primary text-white text-sm font-semibold rounded-lg hover:bg-brand-primary/90 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:ring-offset-2 transition-colors"
          >
            Buscar
          </button>
          <button
            type="button"
            onClick={handleClear}
            className="px-5 py-2 bg-white text-gray-600 text-sm font-medium rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors dark:hover:bg-brand-surface dark:border-brand-muted/30 dark:text-brand-muted dark:bg-brand-surface"
          >
            Limpar
          </button>
        </div>
      </form>

      {/* Global error */}
      {error && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm dark:border-red-900 dark:text-red-400 dark:bg-red-950/40">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden dark:border-brand-muted/20 dark:bg-brand-surface">
        {loading ? (
          <div className="flex items-center justify-center h-48 text-gray-400 text-sm dark:text-brand-muted">
            Carregando...
          </div>
        ) : users.length === 0 ? (
          <div className="flex items-center justify-center h-48 text-gray-400 text-sm dark:text-brand-muted">
            Nenhum usuário encontrado.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 dark:border-brand-muted/20 dark:bg-brand-surface">
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide dark:text-brand-muted">
                    Usuário
                  </th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide dark:text-brand-muted">
                    Telefone
                  </th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide dark:text-brand-muted">
                    CPF
                  </th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide dark:text-brand-muted">
                    Cadastro
                  </th>
                  <th className="text-right px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide dark:text-brand-muted">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-brand-muted/20">
                {users.map((user) => (
                  <tr key={user.idUser} className="hover:bg-gray-50 transition-colors dark:hover:bg-brand-surface">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-brand-primary/10 flex items-center justify-center text-brand-primary text-xs font-bold shrink-0 dark:text-brand-primary dark:bg-brand-primary/60">
                          {getInitials(user.name)}
                        </div>
                        <div className="min-w-0 max-w-[200px]">
                          <div className="font-medium text-gray-900 flex items-center gap-2 dark:text-brand-fg">
                            <span className="truncate">{user.name}</span>
                            {user.admin && (
                              <span className="shrink-0 text-xs font-medium bg-brand-primary/10 text-brand-primary px-1.5 py-0.5 rounded-full dark:text-brand-primary dark:bg-brand-primary/60">
                                Admin
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-brand-muted truncate">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-gray-600 dark:text-brand-muted">{user.phone ?? '—'}</td>
                    <td className="px-5 py-4 text-gray-600 dark:text-brand-muted">{user.cpf ?? '—'}</td>
                    <td className="px-5 py-4 text-gray-600 dark:text-brand-muted">{formatDate(user.createdAt)}</td>
                    <td className="px-5 py-4">
                      {confirmDelete === user.idUser ? (
                        <div className="flex items-center justify-end gap-2">
                          <span className="text-xs text-gray-500 dark:text-brand-muted">Confirmar exclusão?</span>
                          <button
                            onClick={() => handleDelete(user.idUser)}
                            disabled={deleting === user.idUser}
                            className="text-xs font-semibold text-white bg-red-600 hover:bg-red-700 px-3 py-1.5 rounded-lg disabled:opacity-60 transition-colors"
                          >
                            {deleting === user.idUser ? 'Excluindo...' : 'Sim'}
                          </button>
                          <button
                            onClick={() => setConfirmDelete(null)}
                            className="text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg transition-colors dark:hover:bg-brand-surface dark:text-brand-muted dark:bg-brand-surface"
                          >
                            Não
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEdit(user)}
                            className="text-xs font-medium text-brand-primary hover:text-brand-primary bg-brand-primary/10 hover:bg-brand-primary/10 px-3 py-1.5 rounded-lg transition-colors dark:hover:text-brand-primary/80 dark:hover:bg-brand-primary/50 dark:text-brand-primary dark:bg-brand-primary/40"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => setConfirmDelete(user.idUser)}
                            className="text-xs font-medium text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition-colors dark:hover:text-red-300 dark:hover:bg-red-900/50 dark:text-red-400 dark:bg-red-950/40"
                          >
                            Excluir
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Table footer */}
        {!loading && users.length > 0 && (
          <div className="px-5 py-3 border-t border-gray-100 text-xs text-gray-400 dark:border-brand-muted/20 dark:text-brand-muted">
            {users.length} {users.length === 1 ? 'usuário encontrado' : 'usuários encontrados'}
          </div>
        )}
      </div>

      {/* Create modal */}
      {createState && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setCreateState(null)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto dark:bg-brand-surface">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-gray-900 dark:text-brand-fg">Novo usuário</h2>
              <button onClick={() => setCreateState(null)} className="text-gray-400 hover:text-gray-600 transition-colors dark:hover:text-brand-fg dark:text-brand-muted" aria-label="Fechar">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {createState.error && (
              <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm dark:border-red-900 dark:text-red-400 dark:bg-red-950/40">
                {createState.error}
              </div>
            )}

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5 dark:text-brand-fg">
                  Nome completo <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={createState.form.name}
                  onChange={updateCreateField('name')}
                  required
                  placeholder="João Silva"
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent dark:placeholder-brand-muted dark:border-brand-muted/30 dark:text-brand-fg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5 dark:text-brand-fg">
                  E-mail <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={createState.form.email}
                  onChange={updateCreateField('email')}
                  required
                  placeholder="joao@email.com"
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent dark:placeholder-brand-muted dark:border-brand-muted/30 dark:text-brand-fg"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5 dark:text-brand-fg">Telefone</label>
                  <input
                    type="tel"
                    value={createState.form.phone}
                    onChange={updateCreateField('phone')}
                    placeholder="11987654321"
                    className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent dark:placeholder-brand-muted dark:border-brand-muted/30 dark:text-brand-fg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5 dark:text-brand-fg">CPF</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={createState.form.cpf}
                    onChange={updateCreateCpf}
                    placeholder="12345678901"
                    maxLength={11}
                    className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent dark:placeholder-brand-muted dark:border-brand-muted/30 dark:text-brand-fg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5 dark:text-brand-fg">
                  Senha <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  value={createState.form.password}
                  onChange={updateCreateField('password')}
                  required
                  placeholder="Mínimo 6 caracteres"
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent dark:placeholder-brand-muted dark:border-brand-muted/30 dark:text-brand-fg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5 dark:text-brand-fg">
                  Confirmar senha <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  value={createState.form.confirmPassword}
                  onChange={updateCreateField('confirmPassword')}
                  required
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent dark:placeholder-brand-muted dark:border-brand-muted/30 dark:text-brand-fg"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={createState.saving}
                  className="flex-1 py-2.5 bg-brand-primary text-white text-sm font-semibold rounded-lg hover:bg-brand-primary/90 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                >
                  {createState.saving ? 'Cadastrando...' : 'Cadastrar usuário'}
                </button>
                <button
                  type="button"
                  onClick={() => setCreateState(null)}
                  className="px-5 py-2.5 bg-white text-gray-600 text-sm font-medium rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors dark:hover:bg-brand-surface dark:border-brand-muted/30 dark:text-brand-muted dark:bg-brand-surface"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {editState && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setEditState(null)}
          />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6 dark:bg-brand-surface">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-brand-fg">Editar usuário</h2>
                <p className="text-sm text-gray-500 mt-0.5 dark:text-brand-muted">#{editState.user.idUser}</p>
              </div>
              <button
                onClick={() => setEditState(null)}
                className="text-gray-400 hover:text-gray-600 transition-colors dark:hover:text-brand-fg dark:text-brand-muted"
                aria-label="Fechar"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {editState.error && (
              <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm dark:border-red-900 dark:text-red-400 dark:bg-red-950/40">
                {editState.error}
              </div>
            )}

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5 dark:text-brand-fg">
                  Nome completo
                </label>
                <input
                  type="text"
                  value={editState.form.name}
                  onChange={updateEditField('name')}
                  required
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent dark:border-brand-muted/30 dark:text-brand-fg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5 dark:text-brand-fg">
                  E-mail
                </label>
                <input
                  type="email"
                  value={editState.form.email}
                  onChange={updateEditField('email')}
                  required
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent dark:border-brand-muted/30 dark:text-brand-fg"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5 dark:text-brand-fg">
                    Telefone
                  </label>
                  <input
                    type="tel"
                    value={editState.form.phone}
                    onChange={updateEditField('phone')}
                    placeholder="11987654321"
                    className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent dark:border-brand-muted/30 dark:text-brand-fg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5 dark:text-brand-fg">
                    CPF
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={editState.form.cpf}
                    onChange={updateEditCpf}
                    placeholder="12345678901"
                    maxLength={11}
                    className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent dark:border-brand-muted/30 dark:text-brand-fg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5 dark:text-brand-fg">
                  Nova senha{' '}
                  <span className="text-gray-400 font-normal dark:text-brand-muted">(deixe em branco para não alterar)</span>
                </label>
                <input
                  type="password"
                  value={editState.form.password}
                  onChange={updateEditField('password')}
                  placeholder="Mínimo 6 caracteres"
                  minLength={6}
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent dark:border-brand-muted/30 dark:text-brand-fg"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={editState.saving}
                  className="flex-1 py-2.5 bg-brand-primary text-white text-sm font-semibold rounded-lg hover:bg-brand-primary/90 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                >
                  {editState.saving ? 'Salvando...' : 'Salvar alterações'}
                </button>
                <button
                  type="button"
                  onClick={() => setEditState(null)}
                  className="px-5 py-2.5 bg-white text-gray-600 text-sm font-medium rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors dark:hover:bg-brand-surface dark:border-brand-muted/30 dark:text-brand-muted dark:bg-brand-surface"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
