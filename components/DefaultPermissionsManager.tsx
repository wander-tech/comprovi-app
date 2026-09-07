'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import SearchableSelect from '@/components/SearchableSelect';
import { getMe, getUsers, type User } from '@/lib/users';
import {
  getDefaultPermissions,
  addDefaultPermission,
  updateDefaultPermission,
  removeDefaultPermission,
  type UserDefaultPermission,
} from '@/lib/defaultPermissions';
import type { SharingPermission } from '@/lib/sharings';

const PERMISSION_OPTIONS = [
  { value: 'read', label: 'Leitura' },
  { value: 'edit', label: 'Edição' },
];

const inputClass =
  'w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent dark:bg-brand-surface dark:border-brand-muted/30 dark:text-brand-fg dark:placeholder-brand-muted';

export default function DefaultPermissionsManager() {
  const [permissions, setPermissions] = useState<UserDefaultPermission[]>([]);
  const [users, setUsers] = useState<User[] | null>(null);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [selectedUserId, setSelectedUserId] = useState('');
  const [manualUserId, setManualUserId] = useState('');
  const [permission, setPermission] = useState<SharingPermission>('read');
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState('');

  const [savingUserId, setSavingUserId] = useState<number | null>(null);

  const usersById = useMemo(() => {
    const map = new Map<number, User>();
    users?.forEach((u) => map.set(u.idUser, u));
    return map;
  }, [users]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const me = await getMe();
      setCurrentUserId(me.idUser);
      const list = await getDefaultPermissions();
      setPermissions(list);
      if (me.admin) {
        try {
          const allUsers = await getUsers();
          setUsers(allUsers);
        } catch {
          setUsers(null);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar permissões padrão');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const assignedUserIds = useMemo(() => new Set(permissions.map((p) => p.idTargetUser)), [permissions]);

  const selectableUsers = useMemo(
    () => (users ?? []).filter((u) => u.idUser !== currentUserId && !assignedUserIds.has(u.idUser)),
    [users, currentUserId, assignedUserIds],
  );

  function displayUser(idTargetUser: number) {
    const u = usersById.get(idTargetUser);
    return u ? `${u.name} (${u.email})` : `Usuário #${idTargetUser}`;
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const idTargetUser = Number(users ? selectedUserId : manualUserId);
    if (!idTargetUser) {
      setAddError('Selecione ou informe um usuário válido.');
      return;
    }
    setAdding(true);
    setAddError('');
    try {
      const created = await addDefaultPermission({ idTargetUser, permission });
      setPermissions((prev) => [...prev, created]);
      setSelectedUserId('');
      setManualUserId('');
      setPermission('read');
    } catch (err) {
      setAddError(err instanceof Error ? err.message : 'Erro ao adicionar permissão padrão');
    } finally {
      setAdding(false);
    }
  }

  async function handlePermissionChange(idTargetUser: number, newPermission: SharingPermission) {
    setSavingUserId(idTargetUser);
    try {
      const updated = await updateDefaultPermission(idTargetUser, { permission: newPermission });
      setPermissions((prev) => prev.map((p) => (p.idTargetUser === idTargetUser ? updated : p)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar permissão');
    } finally {
      setSavingUserId(null);
    }
  }

  async function handleRemove(idTargetUser: number) {
    setSavingUserId(idTargetUser);
    try {
      await removeDefaultPermission(idTargetUser);
      setPermissions((prev) => prev.filter((p) => p.idTargetUser !== idTargetUser));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao remover permissão padrão');
    } finally {
      setSavingUserId(null);
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 dark:bg-brand-surface dark:border-brand-muted/20">
      <h2 className="text-base font-semibold text-gray-900 mb-1 dark:text-brand-fg">Permissões padrão</h2>
      <p className="text-sm text-gray-500 mb-5 dark:text-brand-muted">
        Usuários adicionados aqui recebem acesso automaticamente em toda nova planilha que você criar.
      </p>

      {error && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm dark:border-red-900 dark:text-red-400 dark:bg-red-950/40">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-24 text-gray-400 text-sm dark:text-brand-muted">Carregando...</div>
      ) : (
        <>
          <div className="mb-5">
            {permissions.length === 0 ? (
              <p className="text-sm text-gray-400 dark:text-brand-muted">Nenhuma permissão padrão configurada.</p>
            ) : (
              <ul className="divide-y divide-gray-100 dark:divide-brand-muted/20 border border-gray-100 rounded-xl overflow-hidden dark:border-brand-muted/20">
                {permissions.map((p) => (
                  <li key={p.idTargetUser} className="flex items-center justify-between gap-3 px-4 py-3">
                    <span className="text-sm text-gray-900 truncate dark:text-brand-fg">{displayUser(p.idTargetUser)}</span>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="w-28">
                        <SearchableSelect
                          value={p.permission}
                          onChange={(v) => handlePermissionChange(p.idTargetUser, v as SharingPermission)}
                          options={PERMISSION_OPTIONS}
                          disabled={savingUserId === p.idTargetUser}
                          className={inputClass}
                        />
                      </div>
                      <button
                        onClick={() => handleRemove(p.idTargetUser)}
                        disabled={savingUserId === p.idTargetUser}
                        className="text-xs font-medium text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 px-3 py-2 rounded-lg transition-colors disabled:opacity-60 dark:hover:text-red-300 dark:hover:bg-red-900/50 dark:text-red-400 dark:bg-red-950/40"
                      >
                        Remover
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <form onSubmit={handleAdd} className="border-t border-gray-100 pt-5 dark:border-brand-muted/20">
            <h3 className="text-sm font-semibold text-gray-700 mb-3 dark:text-brand-fg">Adicionar usuário</h3>

            {addError && (
              <div className="mb-3 px-4 py-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm dark:border-red-900 dark:text-red-400 dark:bg-red-950/40">
                {addError}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3">
              {users ? (
                <SearchableSelect
                  value={selectedUserId}
                  onChange={setSelectedUserId}
                  options={selectableUsers.map((u) => ({ value: String(u.idUser), label: `${u.name} (${u.email})` }))}
                  placeholder="Selecione um usuário"
                  searchPlaceholder="Buscar por nome ou e-mail..."
                  noResultsLabel="Nenhum usuário disponível"
                  className={inputClass}
                />
              ) : (
                <input
                  type="number"
                  min={1}
                  value={manualUserId}
                  onChange={(e) => setManualUserId(e.target.value)}
                  placeholder="ID do usuário"
                  className={inputClass}
                />
              )}
              <div className="w-32">
                <SearchableSelect
                  value={permission}
                  onChange={(v) => setPermission(v as SharingPermission)}
                  options={PERMISSION_OPTIONS}
                  className={inputClass}
                />
              </div>
            </div>
            {!users && (
              <p className="text-xs text-gray-400 mt-2 dark:text-brand-muted">
                Peça o ID do usuário para adicioná-lo. Apenas administradores podem buscar por nome ou e-mail.
              </p>
            )}

            <button
              type="submit"
              disabled={adding}
              className="mt-3 w-full py-2.5 bg-brand-primary text-white text-sm font-semibold rounded-lg hover:bg-brand-primary/90 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            >
              {adding ? 'Adicionando...' : 'Adicionar'}
            </button>
          </form>
        </>
      )}
    </div>
  );
}
