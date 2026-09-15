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
  'w-full px-3.5 py-2.5 bg-canvas border border-hairline rounded-lg text-sm text-ink placeholder-ink-subtle focus:outline-none focus:ring-2 focus:ring-primary-focus focus:border-primary-focus';

const removeButtonClass =
  'text-xs font-medium text-error bg-error/10 hover:bg-error/20 rounded-full px-3 py-2 active:scale-95 transition disabled:opacity-60';

const neutralPillButtonClass =
  'text-xs font-medium text-ink-muted bg-surface-1 hover:bg-surface-2 rounded-full px-3 py-1.5 active:scale-95 transition disabled:opacity-60 shrink-0';

const errorBannerClass = 'px-4 py-3 bg-error/10 border border-error/30 text-error text-sm';

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
    <div className="bg-canvas border border-hairline rounded-lg p-6">
      <h2 className="text-base font-semibold text-ink mb-1">Permissões padrão</h2>
      <p className="text-sm text-ink-muted mb-5">
        Convide alguém por e-mail. Depois que a pessoa aceitar o convite, ela passa a receber acesso
        automaticamente em toda nova planilha que você criar.
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
          <div className="mb-5">
            {permissions.length === 0 ? (
              <p className="text-sm text-ink-subtle">Nenhuma permissão padrão configurada.</p>
            ) : (
              <ul className="divide-y divide-hairline border border-hairline rounded-lg overflow-hidden">
                {permissions.map((p) => (
                  <li key={p.idTargetUser} className="flex items-center justify-between gap-3 px-4 py-3">
                    <span className="text-sm text-ink truncate">{displayUser(p)}</span>
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
                  value={permission}
                  onChange={(v) => setPermission(v as SharingPermission)}
                  options={PERMISSION_OPTIONS}
                  className={inputClass}
                />
              </div>
            </div>
            <p className="text-xs text-ink-subtle mt-2">
              A pessoa precisa já ter uma conta na Comprovi com esse e-mail e aceitar o convite.
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
  );
}
