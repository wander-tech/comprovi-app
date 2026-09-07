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
  active: 'bg-green-100 text-green-700 dark:bg-green-950/60 dark:text-green-400',
  closed: 'bg-gray-100 text-gray-600 dark:bg-brand-surface dark:text-brand-muted',
};

function statusColor(keyCode: string) {
  return STATUS_COLORS[keyCode] ?? 'bg-brand-primary/10 text-brand-primary dark:bg-brand-primary/60 dark:text-brand-primary';
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
    'w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent dark:bg-brand-surface dark:border-brand-muted/30 dark:text-brand-fg dark:placeholder-brand-muted';

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-brand-fg">Planilhas</h1>
          <p className="text-sm text-gray-500 mt-1 dark:text-brand-muted">Gerencie suas planilhas financeiras</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-primary text-white text-sm font-semibold rounded-lg hover:bg-brand-primary/90 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:ring-offset-2 transition-colors whitespace-nowrap"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Nova planilha
        </button>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm dark:border-red-900 dark:text-red-400 dark:bg-red-950/40">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden dark:border-brand-muted/20 dark:bg-brand-surface">
        {loading ? (
          <div className="flex items-center justify-center h-48 text-gray-400 text-sm dark:text-brand-muted">Carregando...</div>
        ) : spreadsheets.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-2">
            <p className="text-gray-400 text-sm dark:text-brand-muted">Nenhuma planilha encontrada.</p>
            <button onClick={openCreate} className="text-sm text-brand-primary hover:text-brand-primary font-medium dark:hover:text-brand-primary/80 dark:text-brand-primary">
              Criar primeira planilha
            </button>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50 dark:border-brand-muted/20 dark:bg-brand-surface">
                    <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide dark:text-brand-muted">Nome</th>
                    <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide dark:text-brand-muted">Status</th>
                    <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide dark:text-brand-muted">Observação</th>
                    <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide dark:text-brand-muted">Criado em</th>
                    <th className="text-right px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide dark:text-brand-muted">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-brand-muted/20">
                  {paged.map((spreadsheet) => (
                    <tr key={spreadsheet.idSpreadsheet} className="hover:bg-gray-50 transition-colors dark:hover:bg-brand-surface">
                      <td className="px-5 py-4 font-medium text-gray-900 dark:text-brand-fg max-w-[220px] truncate">{spreadsheet.name}</td>
                      <td className="px-5 py-4">
                        {spreadsheet.status ? (
                          <span className={`inline-block text-xs font-medium px-2.5 py-1 rounded-full ${statusColor(spreadsheet.status.keyCode)}`}>
                            {spreadsheet.status.name}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-xs dark:text-brand-muted">—</span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-gray-500 max-w-xs truncate dark:text-brand-muted">{spreadsheet.observation || '—'}</td>
                      <td className="px-5 py-4 text-gray-500 whitespace-nowrap dark:text-brand-muted">{formatDate(spreadsheet.createdAt)}</td>
                      <td className="px-5 py-4">
                        {confirmDelete === spreadsheet.idSpreadsheet ? (
                          <div className="flex items-center justify-end gap-2">
                            <span className="text-xs text-gray-500 dark:text-brand-muted">Confirmar exclusão?</span>
                            <button
                              onClick={() => handleDelete(spreadsheet.idSpreadsheet)}
                              disabled={deleting === spreadsheet.idSpreadsheet}
                              className="text-xs font-semibold text-white bg-red-600 hover:bg-red-700 px-3 py-1.5 rounded-lg disabled:opacity-60 transition-colors"
                            >
                              {deleting === spreadsheet.idSpreadsheet ? 'Excluindo...' : 'Sim'}
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
                            <Link
                              href={`/spreadsheets/${spreadsheet.idSpreadsheet}`}
                              className="text-xs font-medium text-green-600 hover:text-green-800 bg-green-50 hover:bg-green-100 px-3 py-1.5 rounded-lg transition-colors dark:hover:text-green-300 dark:hover:bg-green-900/50 dark:text-green-400 dark:bg-green-950/40"
                            >
                              Visualizar
                            </Link>
                            <button
                              onClick={() => openEdit(spreadsheet)}
                              className="text-xs font-medium text-brand-primary hover:text-brand-primary bg-brand-primary/10 hover:bg-brand-primary/10 px-3 py-1.5 rounded-lg transition-colors dark:hover:text-brand-primary/80 dark:hover:bg-brand-primary/50 dark:text-brand-primary dark:bg-brand-primary/40"
                            >
                              Editar
                            </button>
                            {spreadsheet.idOwner === currentUserId && (
                              <button
                                onClick={() => setSharingTarget(spreadsheet)}
                                className="text-xs font-medium text-purple-600 hover:text-purple-800 bg-purple-50 hover:bg-purple-100 px-3 py-1.5 rounded-lg transition-colors dark:hover:text-purple-300 dark:hover:bg-purple-900/50 dark:text-purple-400 dark:bg-purple-950/40"
                              >
                                Compartilhar
                              </button>
                            )}
                            <button
                              onClick={() => setConfirmDelete(spreadsheet.idSpreadsheet)}
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

            {/* Pagination */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-5 py-3.5 border-t border-gray-100 dark:border-brand-muted/20">
              <span className="text-xs text-gray-400 dark:text-brand-muted">
                {spreadsheets.length} {spreadsheets.length === 1 ? 'planilha' : 'planilhas'} — página {page} de {totalPages}
              </span>
              <div className="flex items-center flex-wrap gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors dark:hover:bg-brand-surface dark:border-brand-muted/30 dark:text-brand-muted"
                >
                  Anterior
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`w-8 h-8 text-xs font-medium rounded-lg transition-colors ${p === page
                      ? 'bg-brand-primary text-white'
                      : 'border border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-brand-muted/30 dark:text-brand-muted dark:hover:bg-brand-surface'
                      }`}
                  >
                    {p}
                  </button>
                ))}
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors dark:hover:bg-brand-surface dark:border-brand-muted/30 dark:text-brand-muted"
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
            <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6 dark:bg-brand-surface">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-gray-900 dark:text-brand-fg">
                  {modal.mode === 'create' ? 'Nova planilha' : 'Editar planilha'}
                </h2>
                <button onClick={() => setModal(null)} className="text-gray-400 hover:text-gray-600 transition-colors dark:hover:text-brand-fg dark:text-brand-muted" aria-label="Fechar">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {modal.error && (
                <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm dark:border-red-900 dark:text-red-400 dark:bg-red-950/40">
                  {modal.error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5 dark:text-brand-fg">
                    Nome <span className="text-red-500">*</span>
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
                  <label className="block text-sm font-medium text-gray-700 mb-1.5 dark:text-brand-fg">Status</label>
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
                  <label className="block text-sm font-medium text-gray-700 mb-1.5 dark:text-brand-fg">Observação</label>
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
                    className="flex-1 py-2.5 bg-brand-primary text-white text-sm font-semibold rounded-lg hover:bg-brand-primary/90 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                  >
                    {modal.saving
                      ? modal.mode === 'create' ? 'Criando...' : 'Salvando...'
                      : modal.mode === 'create' ? 'Criar planilha' : 'Salvar alterações'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setModal(null)}
                    className="px-5 py-2.5 bg-white text-gray-600 text-sm font-medium rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors dark:hover:bg-brand-surface dark:border-brand-muted/30 dark:text-brand-muted dark:bg-brand-surface"
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
