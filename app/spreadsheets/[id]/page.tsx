'use client';

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import ExpenseModals, { type ExpenseModalsHandle } from '@/components/ExpenseModals';
import ExpenseActionButtons from '@/components/ExpenseActionButtons';
import { getSpreadsheet, type Spreadsheet } from '@/lib/spreadsheets';
import { getExpenses, deleteExpense, type Expense } from '@/lib/expenses';

const PAGE_SIZE = 10;

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function formatDate(iso: string) {
  const [year, month, day] = iso.substring(0, 10).split('-');
  return `${day}/${month}/${year}`;
}

export default function SpreadsheetExpensesPage() {
  const params = useParams();
  const idSpreadsheet = Number(params?.id);

  const [spreadsheet, setSpreadsheet] = useState<Spreadsheet | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<number | null>(null);
  const modalsRef = useRef<ExpenseModalsHandle>(null);

  const load = useCallback(async () => {
    if (!idSpreadsheet) return;
    setLoading(true);
    setError('');
    try {
      const [sheet, expList] = await Promise.all([
        getSpreadsheet(idSpreadsheet),
        getExpenses(idSpreadsheet),
      ]);
      setSpreadsheet(sheet);
      setExpenses(expList);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  }, [idSpreadsheet]);

  useEffect(() => { load(); }, [load]);

  const totalPages = Math.max(1, Math.ceil(expenses.length / PAGE_SIZE));
  const paged = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return expenses.slice(start, start + PAGE_SIZE);
  }, [expenses, page]);

  const totalAmount = useMemo(
    () => expenses.reduce((sum, e) => sum + Number(e.amount), 0),
    [expenses],
  );

  async function handleDelete(id: number) {
    setDeleting(id);
    try {
      await deleteExpense(idSpreadsheet, id);
      setExpenses((prev) => {
        const next = prev.filter((ex) => ex.idExpense !== id);
        const maxPage = Math.max(1, Math.ceil(next.length / PAGE_SIZE));
        if (page > maxPage) setPage(maxPage);
        return next;
      });
      setConfirmDelete(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao excluir gasto');
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-6">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/spreadsheets"
              className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 transition-colors dark:hover:text-brand-fg dark:text-brand-muted"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              Planilhas
            </Link>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-brand-fg break-words">
            {spreadsheet ? spreadsheet.name : 'Carregando...'}
          </h1>
          {spreadsheet?.status && (
            <span className="inline-block mt-1 text-xs font-medium bg-green-100 text-green-700 px-2 py-0.5 rounded-full dark:text-green-400 dark:bg-green-950/60">
              {spreadsheet.status.name}
            </span>
          )}
        </div>
        <ExpenseActionButtons
          onImportReceipt={() => modalsRef.current?.openReceiptImport()}
          onNewExpense={() => modalsRef.current?.openCreate()}
        />
      </div>

      {/* Summary card */}
      {!loading && expenses.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-5 py-4 dark:border-brand-muted/20 dark:bg-brand-surface">
            <p className="text-xs text-gray-500 uppercase tracking-wide font-medium dark:text-brand-muted">Total de gastos</p>
            <p className="text-xl font-bold text-gray-900 mt-1 dark:text-brand-fg">{formatCurrency(totalAmount)}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-5 py-4 dark:border-brand-muted/20 dark:bg-brand-surface">
            <p className="text-xs text-gray-500 uppercase tracking-wide font-medium dark:text-brand-muted">Lançamentos</p>
            <p className="text-xl font-bold text-gray-900 mt-1 dark:text-brand-fg">{expenses.length}</p>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm dark:border-red-900 dark:text-red-400 dark:bg-red-950/40">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden dark:border-brand-muted/20 dark:bg-brand-surface">
        {loading ? (
          <div className="flex items-center justify-center h-48 text-gray-400 text-sm dark:text-brand-muted">Carregando...</div>
        ) : expenses.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-2">
            <p className="text-gray-400 text-sm dark:text-brand-muted">Nenhum gasto registrado nesta planilha.</p>
            <button onClick={() => modalsRef.current?.openCreate()} className="text-sm text-brand-primary hover:text-brand-primary font-medium dark:hover:text-brand-primary/80 dark:text-brand-primary">
              Adicionar primeiro gasto
            </button>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50 dark:border-brand-muted/20 dark:bg-brand-surface">
                    <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide dark:text-brand-muted">Descrição</th>
                    <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide dark:text-brand-muted">Valor</th>
                    <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide dark:text-brand-muted">Data</th>
                    <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide dark:text-brand-muted">Categoria</th>
                    <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide dark:text-brand-muted">Subcategoria</th>
                    <th className="text-right px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide dark:text-brand-muted">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-brand-muted/20">
                  {paged.map((exp) => (
                    <tr key={exp.idExpense} className="hover:bg-gray-50 transition-colors dark:hover:bg-brand-surface">
                      <td className="px-5 py-4 font-medium text-gray-900 dark:text-brand-fg max-w-[220px] truncate">{exp.description}</td>
                      <td className="px-5 py-4 text-gray-900 font-semibold whitespace-nowrap dark:text-brand-fg">
                        {formatCurrency(Number(exp.amount))}
                      </td>
                      <td className="px-5 py-4 text-gray-500 whitespace-nowrap dark:text-brand-muted">{formatDate(exp.date)}</td>
                      <td className="px-5 py-4">
                        <span className="inline-block text-xs font-medium bg-brand-primary/10 text-brand-primary px-2 py-0.5 rounded-full dark:text-brand-primary dark:bg-brand-primary/40">
                          {exp.category.name}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-gray-500 dark:text-brand-muted">{exp.subcategory.name}</td>
                      <td className="px-5 py-4">
                        {confirmDelete === exp.idExpense ? (
                          <div className="flex items-center justify-end gap-2">
                            <span className="text-xs text-gray-500 dark:text-brand-muted">Confirmar exclusão?</span>
                            <button
                              onClick={() => handleDelete(exp.idExpense)}
                              disabled={deleting === exp.idExpense}
                              className="text-xs font-semibold text-white bg-red-600 hover:bg-red-700 px-3 py-1.5 rounded-lg disabled:opacity-60 transition-colors"
                            >
                              {deleting === exp.idExpense ? 'Excluindo...' : 'Sim'}
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
                            <button
                              onClick={() => modalsRef.current?.openEdit(exp)}
                              className="text-xs font-medium text-brand-primary hover:text-brand-primary bg-brand-primary/10 hover:bg-brand-primary/10 px-3 py-1.5 rounded-lg transition-colors dark:hover:text-brand-primary/80 dark:hover:bg-brand-primary/50 dark:text-brand-primary dark:bg-brand-primary/40"
                            >
                              Editar
                            </button>
                            <button
                              onClick={() => setConfirmDelete(exp.idExpense)}
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
                {expenses.length} {expenses.length === 1 ? 'lançamento' : 'lançamentos'} — página {page} de {totalPages}
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
                    className={`w-8 h-8 text-xs font-medium rounded-lg transition-colors ${p === page ? 'bg-brand-primary text-white' : 'border border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-brand-muted/30 dark:text-brand-muted dark:hover:bg-brand-surface'
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

      <ExpenseModals
        ref={modalsRef}
        spreadsheets={[]}
        lockedSpreadsheetId={idSpreadsheet}
        onExpenseCreated={(created) => {
          if (created.idSpreadsheet === idSpreadsheet) {
            setExpenses((prev) => [created, ...prev]);
          }
        }}
        onExpenseUpdated={(updated) => {
          setExpenses((prev) => prev.map((ex) => (ex.idExpense === updated.idExpense ? updated : ex)));
        }}
      />
    </div>
  );
}
