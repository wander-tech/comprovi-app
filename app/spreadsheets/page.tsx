'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  getSpreadsheets,
  createSpreadsheet,
  updateSpreadsheet,
  deleteSpreadsheet,
  getSpreadsheetStatuses,
  type Spreadsheet,
  type SpreadsheetStatus,
} from '@/lib/spreadsheets';

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
  active: 'bg-green-100 text-green-700',
  closed: 'bg-gray-100 text-gray-600',
};

function statusColor(cdChave: string) {
  return STATUS_COLORS[cdChave] ?? 'bg-blue-100 text-blue-700';
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

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [data, statusList] = await Promise.all([
        getSpreadsheets(),
        getSpreadsheetStatuses(),
      ]);
      setSpreadsheets(data);
      setStatuses(statusList);
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
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setModal((prev) => prev ? { ...prev, form: { ...prev.form, [field]: e.target.value } } : prev);
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
    'w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent';

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Planilhas</h1>
          <p className="text-sm text-gray-500 mt-1">Gerencie suas planilhas financeiras</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Nova planilha
        </button>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48 text-gray-400 text-sm">Carregando...</div>
        ) : spreadsheets.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-2">
            <p className="text-gray-400 text-sm">Nenhuma planilha encontrada.</p>
            <button onClick={openCreate} className="text-sm text-blue-600 hover:text-blue-700 font-medium">
              Criar primeira planilha
            </button>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Nome</th>
                    <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                    <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Observação</th>
                    <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Criado em</th>
                    <th className="text-right px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {paged.map((s) => (
                    <tr key={s.idSpreadsheet} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-4 font-medium text-gray-900">{s.name}</td>
                      <td className="px-5 py-4">
                        {s.status ? (
                          <span className={`inline-block text-xs font-medium px-2.5 py-1 rounded-full ${statusColor(s.status.cdChave)}`}>
                            {s.status.name}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-gray-500 max-w-xs truncate">{s.observation || '—'}</td>
                      <td className="px-5 py-4 text-gray-500 whitespace-nowrap">{formatDate(s.createdAt)}</td>
                      <td className="px-5 py-4">
                        {confirmDelete === s.idSpreadsheet ? (
                          <div className="flex items-center justify-end gap-2">
                            <span className="text-xs text-gray-500">Confirmar exclusão?</span>
                            <button
                              onClick={() => handleDelete(s.idSpreadsheet)}
                              disabled={deleting === s.idSpreadsheet}
                              className="text-xs font-semibold text-white bg-red-600 hover:bg-red-700 px-3 py-1.5 rounded-lg disabled:opacity-60 transition-colors"
                            >
                              {deleting === s.idSpreadsheet ? 'Excluindo...' : 'Sim'}
                            </button>
                            <button
                              onClick={() => setConfirmDelete(null)}
                              className="text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg transition-colors"
                            >
                              Não
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-2">
                            <Link
                              href={`/spreadsheets/${s.idSpreadsheet}`}
                              className="text-xs font-medium text-green-600 hover:text-green-800 bg-green-50 hover:bg-green-100 px-3 py-1.5 rounded-lg transition-colors"
                            >
                              Visualizar
                            </Link>
                            <button
                              onClick={() => openEdit(s)}
                              className="text-xs font-medium text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors"
                            >
                              Editar
                            </button>
                            <button
                              onClick={() => setConfirmDelete(s.idSpreadsheet)}
                              className="text-xs font-medium text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition-colors"
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
            <div className="flex items-center justify-between px-5 py-3.5 border-t border-gray-100">
              <span className="text-xs text-gray-400">
                {spreadsheets.length} {spreadsheets.length === 1 ? 'planilha' : 'planilhas'} — página {page} de {totalPages}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Anterior
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`w-8 h-8 text-xs font-medium rounded-lg transition-colors ${
                      p === page
                        ? 'bg-blue-600 text-white'
                        : 'border border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {p}
                  </button>
                ))}
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Próxima
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Create / Edit modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setModal(null)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-gray-900">
                {modal.mode === 'create' ? 'Nova planilha' : 'Editar planilha'}
              </h2>
              <button onClick={() => setModal(null)} className="text-gray-400 hover:text-gray-600 transition-colors" aria-label="Fechar">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {modal.error && (
              <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                {modal.error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
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
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Status</label>
                <select
                  value={modal.form.idSpreadsheetStatus}
                  onChange={updateField('idSpreadsheetStatus')}
                  className={inputClass}
                >
                  <option value="">Sem status</option>
                  {statuses.map((st) => (
                    <option key={st.idSpreadsheetStatus} value={st.idSpreadsheetStatus}>
                      {st.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Observação</label>
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
                  className="flex-1 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                >
                  {modal.saving
                    ? modal.mode === 'create' ? 'Criando...' : 'Salvando...'
                    : modal.mode === 'create' ? 'Criar planilha' : 'Salvar alterações'}
                </button>
                <button
                  type="button"
                  onClick={() => setModal(null)}
                  className="px-5 py-2.5 bg-white text-gray-600 text-sm font-medium rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
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
