'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  getMyInvitations,
  acceptInvitation,
  declineInvitation,
  type SpreadsheetInvitation,
} from '@/lib/invitations';

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pendente',
  accepted: 'Aceito',
  declined: 'Recusado',
};

const STATUS_COLOR: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950/60 dark:text-yellow-400',
  accepted: 'bg-green-100 text-green-700 dark:bg-green-950/60 dark:text-green-400',
  declined: 'bg-gray-100 text-gray-600 dark:bg-brand-surface dark:text-brand-muted',
};

export default function InvitationsPage() {
  const router = useRouter();
  const [invitations, setInvitations] = useState<SpreadsheetInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [respondingId, setRespondingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getMyInvitations();
      setInvitations(data);
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

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('pt-BR');
  }

  const pending = invitations.filter((i) => i.status === 'pending');
  const answered = invitations.filter((i) => i.status !== 'pending');

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-brand-fg">Convites</h1>
        <p className="text-sm text-gray-500 mt-1 dark:text-brand-muted">Convites de acesso a planilhas recebidos por e-mail</p>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm dark:border-red-900 dark:text-red-400 dark:bg-red-950/40">
          {error}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden dark:border-brand-muted/20 dark:bg-brand-surface">
        {loading ? (
          <div className="flex items-center justify-center h-40 text-gray-400 text-sm dark:text-brand-muted">Carregando...</div>
        ) : invitations.length === 0 ? (
          <div className="flex items-center justify-center h-40 text-gray-400 text-sm dark:text-brand-muted">
            Nenhum convite recebido.
          </div>
        ) : (
          <ul className="divide-y divide-gray-50 dark:divide-brand-muted/20">
            {[...pending, ...answered].map((inv) => (
              <li key={inv.idInvitation} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-5 py-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-gray-900 dark:text-brand-fg truncate">
                      {inv.spreadsheetName ?? `Planilha #${inv.idSpreadsheet}`}
                    </span>
                    <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLOR[inv.status]}`}>
                      {STATUS_LABEL[inv.status]}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5 dark:text-brand-muted">
                    Convidado por {inv.inviterName ?? `usuário #${inv.idInviter}`} · {inv.permission === 'edit' ? 'Edição' : 'Leitura'} · {formatDate(inv.createdAt)}
                  </p>
                </div>
                {inv.status === 'pending' && (
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleAccept(inv)}
                      disabled={respondingId === inv.idInvitation}
                      className="text-xs font-semibold text-white bg-brand-primary hover:bg-brand-primary/90 px-3 py-1.5 rounded-lg disabled:opacity-60 transition-colors"
                    >
                      {respondingId === inv.idInvitation ? 'Aguarde...' : 'Aceitar'}
                    </button>
                    <button
                      onClick={() => handleDecline(inv)}
                      disabled={respondingId === inv.idInvitation}
                      className="text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-60 dark:hover:bg-brand-surface dark:text-brand-muted dark:bg-brand-surface"
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
  );
}
