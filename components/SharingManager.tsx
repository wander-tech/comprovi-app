'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import SearchableSelect from '@/components/SearchableSelect';
import { getMe, getUsers, type User } from '@/lib/users';
import {
  getSharings,
  updateSharing,
  removeSharing,
  type Sharing,
  type SharingPermission,
} from '@/lib/sharings';
import {
  getSpreadsheetInvitations,
  inviteToSpreadsheet,
  cancelInvitation,
  type SpreadsheetInvitation,
} from '@/lib/invitations';

const PERMISSION_OPTIONS = [
  { value: 'read', label: 'Leitura' },
  { value: 'edit', label: 'Edição' },
];

const inputClass =
  'w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent dark:bg-brand-surface dark:border-brand-muted/30 dark:text-brand-fg dark:placeholder-brand-muted';

interface SharingManagerProps {
  idSpreadsheet: number;
  spreadsheetName: string;
  onClose: () => void;
}

export default function SharingManager({ idSpreadsheet, spreadsheetName, onClose }: SharingManagerProps) {
  const [sharings, setSharings] = useState<Sharing[]>([]);
  const [invitations, setInvitations] = useState<SpreadsheetInvitation[]>([]);
  const [users, setUsers] = useState<User[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [inviteEmail, setInviteEmail] = useState('');
  const [invitePermission, setInvitePermission] = useState<SharingPermission>('read');
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState('');

  const [savingUserId, setSavingUserId] = useState<number | null>(null);
  const [cancelingId, setCancelingId] = useState<number | null>(null);

  const usersById = useMemo(() => {
    const map = new Map<number, User>();
    users?.forEach((u) => map.set(u.idUser, u));
    return map;
  }, [users]);

  const emailByUserId = useMemo(() => {
    const map = new Map<number, string>();
    invitations.forEach((inv) => {
      if (inv.invitedUserEmail) map.set(inv.idInvitedUser, inv.invitedUserEmail);
    });
    return map;
  }, [invitations]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const me = await getMe();
      const [sharingsList, invitationsList] = await Promise.all([
        getSharings(idSpreadsheet),
        getSpreadsheetInvitations(idSpreadsheet),
      ]);
      setSharings(sharingsList);
      setInvitations(invitationsList);
      if (me.admin) {
        try {
          const allUsers = await getUsers();
          setUsers(allUsers);
        } catch {
          setUsers(null);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar compartilhamentos');
    } finally {
      setLoading(false);
    }
  }, [idSpreadsheet]);

  useEffect(() => { load(); }, [load]);

  const pendingInvitations = useMemo(
    () => invitations.filter((inv) => inv.status === 'pending'),
    [invitations],
  );

  function displayUser(idUser: number) {
    const u = usersById.get(idUser);
    if (u) return `${u.name} (${u.email})`;
    const email = emailByUserId.get(idUser);
    if (email) return email;
    return `Usuário #${idUser}`;
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!inviteEmail.trim()) {
      setInviteError('Informe um e-mail válido.');
      return;
    }
    setInviting(true);
    setInviteError('');
    try {
      const created = await inviteToSpreadsheet(idSpreadsheet, {
        email: inviteEmail.trim(),
        permission: invitePermission,
      });
      setInvitations((prev) => [created, ...prev]);
      setInviteEmail('');
      setInvitePermission('read');
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : 'Erro ao enviar convite');
    } finally {
      setInviting(false);
    }
  }

  async function handleCancelInvitation(idInvitation: number) {
    setCancelingId(idInvitation);
    try {
      await cancelInvitation(idSpreadsheet, idInvitation);
      setInvitations((prev) => prev.filter((inv) => inv.idInvitation !== idInvitation));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao cancelar convite');
    } finally {
      setCancelingId(null);
    }
  }

  async function handlePermissionChange(idUser: number, newPermission: SharingPermission) {
    setSavingUserId(idUser);
    try {
      const updated = await updateSharing(idSpreadsheet, idUser, { permission: newPermission });
      setSharings((prev) => prev.map((s) => (s.idUser === idUser ? updated : s)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar permissão');
    } finally {
      setSavingUserId(null);
    }
  }

  async function handleRemove(idUser: number) {
    setSavingUserId(idUser);
    try {
      await removeSharing(idSpreadsheet, idUser);
      setSharings((prev) => prev.filter((s) => s.idUser !== idUser));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao remover acesso');
    } finally {
      setSavingUserId(null);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto dark:bg-brand-surface">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-lg font-bold text-gray-900 dark:text-brand-fg">Controle de acesso</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors dark:hover:text-brand-fg dark:text-brand-muted" aria-label="Fechar">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <p className="text-sm text-gray-500 mb-5 truncate dark:text-brand-muted">{spreadsheetName}</p>

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
              <h3 className="text-sm font-semibold text-gray-700 mb-2 dark:text-brand-fg">Quem tem acesso</h3>
              {sharings.length === 0 ? (
                <p className="text-sm text-gray-400 dark:text-brand-muted">Nenhum usuário com acesso além de você.</p>
              ) : (
                <ul className="divide-y divide-gray-100 dark:divide-brand-muted/20 border border-gray-100 rounded-xl overflow-hidden dark:border-brand-muted/20">
                  {sharings.map((s) => (
                    <li key={s.idUser} className="flex items-center justify-between gap-3 px-4 py-3">
                      <span className="text-sm text-gray-900 truncate dark:text-brand-fg">{displayUser(s.idUser)}</span>
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="w-28">
                          <SearchableSelect
                            value={s.permission}
                            onChange={(v) => handlePermissionChange(s.idUser, v as SharingPermission)}
                            options={PERMISSION_OPTIONS}
                            disabled={savingUserId === s.idUser}
                            className={inputClass}
                          />
                        </div>
                        <button
                          onClick={() => handleRemove(s.idUser)}
                          disabled={savingUserId === s.idUser}
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

            {pendingInvitations.length > 0 && (
              <div className="mb-5">
                <h3 className="text-sm font-semibold text-gray-700 mb-2 dark:text-brand-fg">Convites pendentes</h3>
                <ul className="divide-y divide-gray-100 dark:divide-brand-muted/20 border border-gray-100 rounded-xl overflow-hidden dark:border-brand-muted/20">
                  {pendingInvitations.map((inv) => (
                    <li key={inv.idInvitation} className="flex items-center justify-between gap-3 px-4 py-3">
                      <div className="min-w-0">
                        <span className="text-sm text-gray-900 truncate block dark:text-brand-fg">{inv.invitedUserEmail}</span>
                        <span className="text-xs text-gray-400 dark:text-brand-muted">
                          {inv.permission === 'edit' ? 'Edição' : 'Leitura'} · aguardando resposta
                        </span>
                      </div>
                      <button
                        onClick={() => handleCancelInvitation(inv.idInvitation)}
                        disabled={cancelingId === inv.idInvitation}
                        className="text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-60 shrink-0 dark:hover:bg-brand-surface dark:text-brand-muted dark:bg-brand-surface"
                      >
                        {cancelingId === inv.idInvitation ? 'Cancelando...' : 'Cancelar convite'}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <form onSubmit={handleInvite} className="border-t border-gray-100 pt-5 dark:border-brand-muted/20">
              <h3 className="text-sm font-semibold text-gray-700 mb-3 dark:text-brand-fg">Convidar por e-mail</h3>

              {inviteError && (
                <div className="mb-3 px-4 py-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm dark:border-red-900 dark:text-red-400 dark:bg-red-950/40">
                  {inviteError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3">
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="email@exemplo.com"
                  className={inputClass}
                />
                <div className="w-32">
                  <SearchableSelect
                    value={invitePermission}
                    onChange={(v) => setInvitePermission(v as SharingPermission)}
                    options={PERMISSION_OPTIONS}
                    className={inputClass}
                  />
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-2 dark:text-brand-muted">
                O acesso só é concedido depois que o convite for aceito.
              </p>

              <button
                type="submit"
                disabled={inviting}
                className="mt-3 w-full py-2.5 bg-brand-primary text-white text-sm font-semibold rounded-lg hover:bg-brand-primary/90 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
              >
                {inviting ? 'Enviando...' : 'Enviar convite'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
