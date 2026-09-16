'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { format, parseISO } from 'date-fns';
import {
  getMyInvitations,
  acceptInvitation,
  declineInvitation,
  type SpreadsheetInvitation,
} from '@/lib/invitations';
import {
  getReceivedDefaultPermissionInvitations,
  acceptDefaultPermissionInvitation,
  declineDefaultPermissionInvitation,
  type DefaultPermissionInvitation,
} from '@/lib/defaultPermissions';

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pendente',
  accepted: 'Aceito',
  declined: 'Recusado',
};

const STATUS_COLOR: Record<string, string> = {
  pending: 'bg-warning/20 text-ink',
  accepted: 'bg-success/10 text-success',
  declined: 'bg-surface-2 text-ink-muted',
};

export default function InvitationsPage() {
  const router = useRouter();
  const [invitations, setInvitations] = useState<SpreadsheetInvitation[]>([]);
  const [defaultPermissionInvitations, setDefaultPermissionInvitations] = useState<DefaultPermissionInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [respondingId, setRespondingId] = useState<number | null>(null);
  const [respondingDefaultPermissionId, setRespondingDefaultPermissionId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [data, defaultPermissionData] = await Promise.all([
        getMyInvitations(),
        getReceivedDefaultPermissionInvitations(),
      ]);
      setInvitations(data);
      setDefaultPermissionInvitations(defaultPermissionData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar convites');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleAccept(inv: SpreadsheetInvitation) {
    setRespondingId(inv.idInvitation);
    try {
      const updated = await acceptInvitation(inv.idInvitation);
      setInvitations((prev) => prev.map((i) => (i.idInvitation === updated.idInvitation ? updated : i)));
      router.push(`/spreadsheets/${inv.idSpreadsheet}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao aceitar convite');
    } finally {
      setRespondingId(null);
    }
  }

  async function handleDecline(inv: SpreadsheetInvitation) {
    setRespondingId(inv.idInvitation);
    try {
      const updated = await declineInvitation(inv.idInvitation);
      setInvitations((prev) => prev.map((i) => (i.idInvitation === updated.idInvitation ? updated : i)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao recusar convite');
    } finally {
      setRespondingId(null);
    }
  }

  async function handleAcceptDefaultPermission(inv: DefaultPermissionInvitation) {
    setRespondingDefaultPermissionId(inv.idInvitation);
    try {
      const updated = await acceptDefaultPermissionInvitation(inv.idInvitation);
      setDefaultPermissionInvitations((prev) => prev.map((i) => (i.idInvitation === updated.idInvitation ? updated : i)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao aceitar convite');
    } finally {
      setRespondingDefaultPermissionId(null);
    }
  }

  async function handleDeclineDefaultPermission(inv: DefaultPermissionInvitation) {
    setRespondingDefaultPermissionId(inv.idInvitation);
    try {
      const updated = await declineDefaultPermissionInvitation(inv.idInvitation);
      setDefaultPermissionInvitations((prev) => prev.map((i) => (i.idInvitation === updated.idInvitation ? updated : i)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao recusar convite');
    } finally {
      setRespondingDefaultPermissionId(null);
    }
  }

  function formatDate(iso: string) {
    return format(parseISO(iso), 'dd/MM/yyyy');
  }

  const pending = invitations.filter((i) => i.status === 'pending');
  const answered = invitations.filter((i) => i.status !== 'pending');
  const pendingDefaultPermissions = defaultPermissionInvitations.filter((i) => i.status === 'pending');
  const answeredDefaultPermissions = defaultPermissionInvitations.filter((i) => i.status !== 'pending');

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-ink">Convites</h1>
        <p className="text-sm text-ink-muted mt-1">Convites recebidos por e-mail</p>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 bg-error/10 border border-error/30 text-error text-sm">
          {error}
        </div>
      )}

      <div className="mb-8">
        <h2 className="text-sm font-semibold text-ink mb-3">Acesso a planilhas</h2>
        <div className="bg-canvas border border-hairline rounded-lg overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-40 text-ink-subtle text-sm">Carregando...</div>
          ) : invitations.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-ink-subtle text-sm">
              Nenhum convite recebido.
            </div>
          ) : (
            <ul className="divide-y divide-hairline">
              {[...pending, ...answered].map((inv) => (
                <li key={inv.idInvitation} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-5 py-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-ink truncate">
                        {inv.spreadsheetName ?? `Planilha #${inv.idSpreadsheet}`}
                      </span>
                      <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLOR[inv.status]}`}>
                        {STATUS_LABEL[inv.status]}
                      </span>
                    </div>
                    <p className="text-xs text-ink-muted mt-0.5">
                      Convidado por {inv.inviterName ?? `usuário #${inv.idInviter}`} · {inv.permission === 'edit' ? 'Edição' : 'Leitura'} · {formatDate(inv.createdAt)}
                    </p>
                  </div>
                  {inv.status === 'pending' && (
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleAccept(inv)}
                        disabled={respondingId === inv.idInvitation}
                        className="text-xs font-semibold text-on-primary bg-primary hover:bg-primary-hover rounded-full px-3 py-1.5 active:scale-95 disabled:opacity-60 transition"
                      >
                        {respondingId === inv.idInvitation ? 'Aguarde...' : 'Aceitar'}
                      </button>
                      <button
                        onClick={() => handleDecline(inv)}
                        disabled={respondingId === inv.idInvitation}
                        className="text-xs font-medium text-ink-muted bg-surface-1 hover:bg-surface-2 rounded-full px-3 py-1.5 active:scale-95 transition disabled:opacity-60"
                      >
                        Recusar
                      </button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-ink mb-3">Permissão padrão</h2>
        <p className="text-xs text-ink-muted mb-3">
          Se você aceitar, passará a receber acesso automaticamente em toda nova planilha criada por essa pessoa.
        </p>
        <div className="bg-canvas border border-hairline rounded-lg overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-40 text-ink-subtle text-sm">Carregando...</div>
          ) : defaultPermissionInvitations.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-ink-subtle text-sm">
              Nenhum convite recebido.
            </div>
          ) : (
            <ul className="divide-y divide-hairline">
              {[...pendingDefaultPermissions, ...answeredDefaultPermissions].map((inv) => (
                <li key={inv.idInvitation} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-5 py-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-ink truncate">
                        {inv.inviterName ?? inv.inviterEmail ?? `usuário #${inv.idInviter}`}
                      </span>
                      <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLOR[inv.status]}`}>
                        {STATUS_LABEL[inv.status]}
                      </span>
                    </div>
                    <p className="text-xs text-ink-muted mt-0.5">
                      {inv.permission === 'edit' ? 'Edição' : 'Leitura'} · {formatDate(inv.createdAt)}
                    </p>
                  </div>
                  {inv.status === 'pending' && (
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleAcceptDefaultPermission(inv)}
                        disabled={respondingDefaultPermissionId === inv.idInvitation}
                        className="text-xs font-semibold text-on-primary bg-primary hover:bg-primary-hover rounded-full px-3 py-1.5 active:scale-95 disabled:opacity-60 transition"
                      >
                        {respondingDefaultPermissionId === inv.idInvitation ? 'Aguarde...' : 'Aceitar'}
                      </button>
                      <button
                        onClick={() => handleDeclineDefaultPermission(inv)}
                        disabled={respondingDefaultPermissionId === inv.idInvitation}
                        className="text-xs font-medium text-ink-muted bg-surface-1 hover:bg-surface-2 rounded-full px-3 py-1.5 active:scale-95 transition disabled:opacity-60"
                      >
                        Recusar
                      </button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
