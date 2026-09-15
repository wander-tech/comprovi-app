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
  'w-full px-3.5 py-2.5 bg-canvas border border-hairline rounded-lg text-sm text-ink placeholder-ink-subtle focus:outline-none focus:ring-2 focus:ring-primary-focus focus:border-primary-focus';

const removeButtonClass =
  'text-xs font-medium text-error bg-error/10 hover:bg-error/20 rounded-full px-3 py-2 active:scale-95 transition disabled:opacity-60';

const neutralPillButtonClass =
  'text-xs font-medium text-ink-muted bg-surface-1 hover:bg-surface-2 rounded-full px-3 py-1.5 active:scale-95 transition disabled:opacity-60 shrink-0';

const errorBannerClass = 'px-4 py-3 bg-error/10 border border-error/30 text-error text-sm';

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
      <div className="relative bg-canvas shadow-xl rounded-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-lg font-semibold text-ink">Controle de acesso</h2>
          <button onClick={onClose} className="text-ink-subtle hover:text-ink transition-colors" aria-label="Fechar">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <p className="text-sm text-ink-muted mb-5 truncate">{spreadsheetName}</p>

        {error && (
          <div className={`mb-4 ${errorBannerClass}`}>
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center h-24 text-ink-subtle text-sm">Carregando...</div>
        ) : (
          <>
            <div className="mb-5">
              <h3 className="text-sm font-semibold text-ink mb-2">Quem tem acesso</h3>
              {sharings.length === 0 ? (
                <p className="text-sm text-ink-subtle">Nenhum usuário com acesso além de você.</p>
              ) : (
                <ul className="divide-y divide-hairline border border-hairline rounded-lg overflow-hidden">
                  {sharings.map((s) => (
                    <li key={s.idUser} className="flex items-center justify-between gap-3 px-4 py-3">
                      <span className="text-sm text-ink truncate">{displayUser(s.idUser)}</span>
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
                          className={removeButtonClass}
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
                <h3 className="text-sm font-semibold text-ink mb-2">Convites pendentes</h3>
                <ul className="divide-y divide-hairline border border-hairline rounded-lg overflow-hidden">
                  {pendingInvitations.map((inv) => (
                    <li key={inv.idInvitation} className="flex items-center justify-between gap-3 px-4 py-3">
                      <div className="min-w-0">
                        <span className="text-sm text-ink truncate block">{inv.invitedUserEmail}</span>
                        <span className="text-xs text-ink-subtle">
                          {inv.permission === 'edit' ? 'Edição' : 'Leitura'} · aguardando resposta
                        </span>
                      </div>
                      <button
                        onClick={() => handleCancelInvitation(inv.idInvitation)}
                        disabled={cancelingId === inv.idInvitation}
                        className={neutralPillButtonClass}
                      >
                        {cancelingId === inv.idInvitation ? 'Cancelando...' : 'Cancelar convite'}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <form onSubmit={handleInvite} className="border-t border-hairline pt-5">
              <h3 className="text-sm font-semibold text-ink mb-3">Convidar por e-mail</h3>

              {inviteError && (
                <div className={`mb-3 ${errorBannerClass}`}>
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
              <p className="text-xs text-ink-subtle mt-2">
                O acesso só é concedido depois que o convite for aceito.
              </p>

              <button
                type="submit"
                disabled={inviting}
                className="mt-3 w-full py-2.5 rounded-full bg-primary text-on-primary text-sm font-semibold hover:bg-primary-hover active:scale-95 focus:outline-none focus:ring-2 focus:ring-primary-focus focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed transition"
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
