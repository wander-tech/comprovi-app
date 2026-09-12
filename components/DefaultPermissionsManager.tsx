'use client';

import { useCallback, useEffect, useState } from 'react';
import SearchableSelect from '@/components/SearchableSelect';
import {
  getDefaultPermissions,
  inviteDefaultPermission,
  updateDefaultPermission,
  removeDefaultPermission,
  getSentDefaultPermissionInvitations,
  cancelDefaultPermissionInvitation,
  type UserDefaultPermission,
  type DefaultPermissionInvitation,
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
  const [pendingInvitations, setPendingInvitations] = useState<DefaultPermissionInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [inviteEmail, setInviteEmail] = useState('');
  const [permission, setPermission] = useState<SharingPermission>('read');
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState('');

  const [savingUserId, setSavingUserId] = useState<number | null>(null);
  const [cancelingId, setCancelingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [list, invitations] = await Promise.all([
        getDefaultPermissions(),
        getSentDefaultPermissionInvitations(),
      ]);
      setPermissions(list);
      setPendingInvitations(invitations.filter((inv) => inv.status === 'pending'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar permissões padrão');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function displayUser(p: UserDefaultPermission) {
    return p.targetName ? `${p.targetName} (${p.targetEmail})` : p.targetEmail;
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
      const created = await inviteDefaultPermission({ email: inviteEmail.trim(), permission });
      setPendingInvitations((prev) => [created, ...prev]);
      setInviteEmail('');
      setPermission('read');
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : 'Erro ao enviar convite');
    } finally {
      setInviting(false);
    }
  }

  async function handleCancelInvitation(idInvitation: number) {
    setCancelingId(idInvitation);
    try {
      await cancelDefaultPermissionInvitation(idInvitation);
      setPendingInvitations((prev) => prev.filter((inv) => inv.idInvitation !== idInvitation));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao cancelar convite');
    } finally {
      setCancelingId(null);
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
        Convide alguém por e-mail. Depois que a pessoa aceitar o convite, ela passa a receber acesso
        automaticamente em toda nova planilha que você criar.
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
                    <span className="text-sm text-gray-900 truncate dark:text-brand-fg">{displayUser(p)}</span>
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
                  value={permission}
                  onChange={(v) => setPermission(v as SharingPermission)}
                  options={PERMISSION_OPTIONS}
                  className={inputClass}
                />
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-2 dark:text-brand-muted">
              A pessoa precisa já ter uma conta na Comprovi com esse e-mail e aceitar o convite.
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
  );
}
