'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import SearchableSelect from '@/components/SearchableSelect';
import SharingManager from '@/components/SharingManager';
import {
  getSpreadsheets,
  createSpreadsheet,
  updateSpreadsheet,
  deleteSpreadsheet,
  getSpreadsheetStatuses,
  type Spreadsheet,
  type SpreadsheetStatus,
} from '@/lib/spreadsheets';
import { getMe } from '@/lib/users';

const PAGE_SIZE = 10;
const EMPTY_FORM = { name: '', idSpreadsheetStatus: '', observation: '' };

interface ModalState {
  mode: 'create' | 'edit';
  spreadsheet?: Spreadsheet;
  form: typeof EMPTY_FORM;
  saving: boolean;
  error: string;
}

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-success/10 text-success',
  closed: 'bg-surface-2 text-ink-muted',
};

function statusColor(keyCode: string) {
  return STATUS_COLORS[keyCode] ?? 'bg-primary/10 text-primary';
}

export default function SpreadsheetsPage() {
  const [spreadsheets, setSpreadsheets] = useState<Spreadsheet[]>([]);
  const [statuses, setStatuses] = useState<SpreadsheetStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [modal, setModal] = useState<ModalState | null>(null);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [sharingTarget, setSharingTarget] = useState<Spreadsheet | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [data, statusList, me] = await Promise.all([
        getSpreadsheets(),
        getSpreadsheetStatuses(),
        getMe(),
      ]);
      setSpreadsheets(data);
      setStatuses(statusList);
      setCurrentUserId(me.idUser);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar planilhas');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const totalPages = Math.max(1, Math.ceil(spreadsheets.length / PAGE_SIZE));
  const paged = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return spreadsheets.slice(start, start + PAGE_SIZE);
  }, [spreadsheets, page]);

  function openCreate() {
    setModal({ mode: 'create', form: EMPTY_FORM, saving: false, error: '' });
  }

  function openEdit(s: Spreadsheet) {
    setModal({
      mode: 'edit',
      spreadsheet: s,
      form: {
        name: s.name,
        idSpreadsheetStatus: s.idSpreadsheetStatus ? String(s.idSpreadsheetStatus) : '',
        observation: s.observation ?? '',
      },
      saving: false,
      error: '',
    });
  }

  function updateField(field: keyof typeof EMPTY_FORM) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setModal((prev) => prev ? { ...prev, form: { ...prev.form, [field]: e.target.value } } : prev);
  }

  function updateStatus(value: string) {
    setModal((prev) => (prev ? { ...prev, form: { ...prev.form, idSpreadsheetStatus: value } } : prev));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!modal) return;
    setModal((prev) => prev && { ...prev, saving: true, error: '' });
    try {
      const payload = {
        name: modal.form.name,
        observation: modal.form.observation || undefined,
        idSpreadsheetStatus: modal.form.idSpreadsheetStatus ? Number(modal.form.idSpreadsheetStatus) : undefined,
      };
      if (modal.mode === 'create') {
        const created = await createSpreadsheet(payload);
        setSpreadsheets((prev) => [created, ...prev]);
      } else if (modal.spreadsheet) {
        const updated = await updateSpreadsheet(modal.spreadsheet.idSpreadsheet, payload);
        setSpreadsheets((prev) => prev.map((s) => s.idSpreadsheet === updated.idSpreadsheet ? updated : s));
      }
      setModal(null);
    } catch (err) {
      setModal((prev) => prev && {
        ...prev,
        saving: false,
        error: err instanceof Error ? err.message : 'Erro ao salvar',
      });
    }
  }

  async function handleDelete(id: number) {
    setDeleting(id);
    try {
      await deleteSpreadsheet(id);
      setSpreadsheets((prev) => {
        const next = prev.filter((s) => s.idSpreadsheet !== id);
        const maxPage = Math.max(1, Math.ceil(next.length / PAGE_SIZE));
        if (page > maxPage) setPage(maxPage);
        return next;
      });
      setConfirmDelete(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao excluir planilha');
    } finally {
      setDeleting(null);
    }
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('pt-BR');
  }

  const inputClass =
    'w-full px-3.5 py-2.5 bg-canvas border border-hairline rounded-lg text-sm text-ink placeholder-ink-subtle focus:outline-none focus:ring-2 focus:ring-primary-focus focus:border-primary-focus';

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Planilhas</h1>
          <p className="text-sm text-ink-muted mt-1">Gerencie suas planilhas financeiras</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-full bg-primary text-on-primary text-sm font-semibold hover:bg-primary-hover active:scale-95 focus:outline-none focus:ring-2 focus:ring-primary-focus focus:ring-offset-2 transition whitespace-nowrap"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Nova planilha
        </button>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 bg-error/10 border border-error/30 text-error text-sm">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="bg-canvas border border-hairline rounded-lg overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48 text-ink-subtle text-sm">Carregando...</div>
        ) : spreadsheets.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-2">
            <p className="text-ink-subtle text-sm">Nenhuma planilha encontrada.</p>
            <button onClick={openCreate} className="text-sm text-primary hover:underline font-medium">
              Criar primeira planilha
            </button>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-hairline bg-canvas">
                    <th className="text-left px-5 py-3.5 text-xs font-semibold text-ink-muted uppercase tracking-wide">Nome</th>
                    <th className="text-left px-5 py-3.5 text-xs font-semibold text-ink-muted uppercase tracking-wide">Status</th>
                    <th className="text-left px-5 py-3.5 text-xs font-semibold text-ink-muted uppercase tracking-wide">Observação</th>
                    <th className="text-left px-5 py-3.5 text-xs font-semibold text-ink-muted uppercase tracking-wide">Criado em</th>
                    <th className="text-right px-5 py-3.5 text-xs font-semibold text-ink-muted uppercase tracking-wide">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-hairline">
                  {paged.map((spreadsheet) => (
                    <tr key={spreadsheet.idSpreadsheet} className="hover:bg-surface-1 transition-colors">
                      <td className="px-5 py-4 font-medium text-ink max-w-[220px] truncate">{spreadsheet.name}</td>
                      <td className="px-5 py-4">
                        {spreadsheet.status ? (
                          <span className={`inline-block text-xs font-medium px-2.5 py-1 rounded-full ${statusColor(spreadsheet.status.keyCode)}`}>
                            {spreadsheet.status.name}
                          </span>
                        ) : (
                          <span className="text-ink-subtle text-xs">—</span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-ink-muted max-w-xs truncate">{spreadsheet.observation || '—'}</td>
                      <td className="px-5 py-4 text-ink-muted whitespace-nowrap">{formatDate(spreadsheet.createdAt)}</td>
                      <td className="px-5 py-4">
                        {confirmDelete === spreadsheet.idSpreadsheet ? (
                          <div className="flex items-center justify-end gap-2">
                            <span className="text-xs text-ink-muted">Confirmar exclusão?</span>
                            <button
                              onClick={() => handleDelete(spreadsheet.idSpreadsheet)}
                              disabled={deleting === spreadsheet.idSpreadsheet}
                              className="text-xs font-semibold text-on-primary bg-error hover:bg-error/90 rounded-full px-3 py-1.5 active:scale-95 disabled:opacity-60 transition"
                            >
                              {deleting === spreadsheet.idSpreadsheet ? 'Excluindo...' : 'Sim'}
                            </button>
                            <button
                              onClick={() => setConfirmDelete(null)}
                              className="text-xs font-medium text-ink-muted bg-surface-1 hover:bg-surface-2 rounded-full px-3 py-1.5 active:scale-95 transition"
                            >
                              Não
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-2">
                            <Link
                              href={`/spreadsheets/${spreadsheet.idSpreadsheet}`}
                              className="text-xs font-medium text-ink-muted bg-surface-1 hover:bg-surface-2 rounded-full px-3 py-1.5 active:scale-95 transition"
                            >
                              Visualizar
                            </Link>
                            <button
                              onClick={() => openEdit(spreadsheet)}
                              className="text-xs font-medium text-primary bg-primary/10 hover:bg-primary/20 rounded-full px-3 py-1.5 active:scale-95 transition"
                            >
                              Editar
                            </button>
                            {spreadsheet.idOwner === currentUserId && (
                              <button
                                onClick={() => setSharingTarget(spreadsheet)}
                                className="text-xs font-medium text-primary border border-primary/40 hover:bg-primary/10 rounded-full px-3 py-1.5 active:scale-95 transition"
                              >
                                Compartilhar
                              </button>
                            )}
                            <button
                              onClick={() => setConfirmDelete(spreadsheet.idSpreadsheet)}
                              className="text-xs font-medium text-error bg-error/10 hover:bg-error/20 rounded-full px-3 py-1.5 active:scale-95 transition"
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

            {/* Pagination */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-5 py-3.5 border-t border-hairline">
              <span className="text-xs text-ink-subtle">
                {spreadsheets.length} {spreadsheets.length === 1 ? 'planilha' : 'planilhas'} — página {page} de {totalPages}
              </span>
              <div className="flex items-center flex-wrap gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 rounded-full text-xs font-medium border border-hairline text-ink-muted hover:bg-surface-1 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Anterior
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`w-8 h-8 rounded-full text-xs font-medium transition-colors ${p === page
                      ? 'bg-primary text-on-primary'
                      : 'border border-hairline text-ink-muted hover:bg-surface-1'
                      }`}
                  >
                    {p}
                  </button>
                ))}
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1.5 rounded-full text-xs font-medium border border-hairline text-ink-muted hover:bg-surface-1 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Próxima
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Create / Edit modal */}
      {
        modal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setModal(null)} />
            <div className="relative bg-canvas shadow-xl rounded-2xl w-full max-w-md p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-ink">
                  {modal.mode === 'create' ? 'Nova planilha' : 'Editar planilha'}
                </h2>
                <button onClick={() => setModal(null)} className="text-ink-subtle hover:text-ink transition-colors" aria-label="Fechar">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {modal.error && (
                <div className="mb-4 px-4 py-3 bg-error/10 border border-error/30 text-error text-sm">
                  {modal.error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-ink-muted mb-1.5">
                    Nome <span className="text-error">*</span>
                  </label>
                  <input
                    type="text"
                    value={modal.form.name}
                    onChange={updateField('name')}
                    required
                    placeholder="Ex: Janeiro 2025"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-ink-muted mb-1.5">Status</label>
                  <SearchableSelect
                    value={modal.form.idSpreadsheetStatus}
                    onChange={updateStatus}
                    options={statuses.map((st) => ({ value: String(st.idSpreadsheetStatus), label: st.name }))}
                    emptyOptionLabel="Sem status"
                    placeholder="Sem status"
                    searchPlaceholder="Buscar status..."
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-ink-muted mb-1.5">Observação</label>
                  <textarea
                    value={modal.form.observation}
                    onChange={updateField('observation')}
                    placeholder="Observações sobre esta planilha..."
                    rows={3}
                    className={`${inputClass} resize-none`}
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="submit"
                    disabled={modal.saving}
                    className="flex-1 py-2.5 rounded-full bg-primary text-on-primary text-sm font-semibold hover:bg-primary-hover active:scale-95 focus:outline-none focus:ring-2 focus:ring-primary-focus focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed transition"
                  >
                    {modal.saving
                      ? modal.mode === 'create' ? 'Criando...' : 'Salvando...'
                      : modal.mode === 'create' ? 'Criar planilha' : 'Salvar alterações'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setModal(null)}
                    className="px-5 py-2.5 rounded-full bg-canvas text-ink-muted text-sm font-medium border border-hairline hover:bg-surface-1 active:scale-95 transition"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          </div>
        )
      }

      {sharingTarget && (
        <SharingManager
          idSpreadsheet={sharingTarget.idSpreadsheet}
          spreadsheetName={sharingTarget.name}
          onClose={() => setSharingTarget(null)}
        />
      )}
    </div >
  );
}
