'use client';

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import ExpenseModals, { type ExpenseModalsHandle } from '@/components/ExpenseModals';
import ExpenseActionButtons from '@/components/ExpenseActionButtons';
import SharingManager from '@/components/SharingManager';
import { getSpreadsheet, type Spreadsheet } from '@/lib/spreadsheets';
import { getExpenses, deleteExpense, type Expense } from '@/lib/expenses';
import { getMe } from '@/lib/users';

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
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [showSharing, setShowSharing] = useState(false);
  const modalsRef = useRef<ExpenseModalsHandle>(null);

  const load = useCallback(async () => {
    if (!idSpreadsheet) return;
    setLoading(true);
    setError('');
    try {
      const [sheet, expList, me] = await Promise.all([
        getSpreadsheet(idSpreadsheet),
        getExpenses(idSpreadsheet),
        getMe(),
      ]);
      setSpreadsheet(sheet);
      setExpenses(expList);
      setCurrentUserId(me.idUser);
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
              className="text-sm text-ink-muted hover:text-ink flex items-center gap-1 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              Planilhas
            </Link>
          </div>
          <h1 className="text-2xl font-semibold text-ink break-words">
            {spreadsheet ? spreadsheet.name : 'Carregando...'}
          </h1>
          {spreadsheet?.status && (
            <span className="inline-block mt-1 text-xs font-medium bg-success/10 text-success px-2 py-0.5 rounded-full">
              {spreadsheet.status.name}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {spreadsheet && spreadsheet.idOwner === currentUserId && (
            <button
              onClick={() => setShowSharing(true)}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-full text-primary border border-primary/40 text-sm font-semibold hover:bg-primary/10 active:scale-95 transition whitespace-nowrap"
            >
              Gerenciar acesso
            </button>
          )}
          <ExpenseActionButtons
            onImportReceipt={() => modalsRef.current?.openReceiptImport()}
            onNewExpense={() => modalsRef.current?.openCreate()}
          />
        </div>
      </div>

      {/* Summary card */}
      {!loading && expenses.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-canvas border border-hairline rounded-lg px-5 py-4">
            <p className="text-xs text-ink-muted uppercase tracking-wide font-medium">Total de gastos</p>
            <p className="text-xl font-semibold text-ink mt-1">{formatCurrency(totalAmount)}</p>
          </div>
          <div className="bg-canvas border border-hairline rounded-lg px-5 py-4">
            <p className="text-xs text-ink-muted uppercase tracking-wide font-medium">Lançamentos</p>
            <p className="text-xl font-semibold text-ink mt-1">{expenses.length}</p>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-4 px-4 py-3 bg-error/10 border border-error/30 text-error text-sm">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="bg-canvas border border-hairline rounded-lg overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48 text-ink-subtle text-sm">Carregando...</div>
        ) : expenses.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-2">
            <p className="text-ink-subtle text-sm">Nenhum gasto registrado nesta planilha.</p>
            <button onClick={() => modalsRef.current?.openCreate()} className="text-sm text-primary hover:underline font-medium">
              Adicionar primeiro gasto
            </button>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-hairline bg-canvas">
                    <th className="text-left px-5 py-3.5 text-xs font-semibold text-ink-muted uppercase tracking-wide">Descrição</th>
                    <th className="text-left px-5 py-3.5 text-xs font-semibold text-ink-muted uppercase tracking-wide">Valor</th>
                    <th className="text-left px-5 py-3.5 text-xs font-semibold text-ink-muted uppercase tracking-wide">Data</th>
                    <th className="text-left px-5 py-3.5 text-xs font-semibold text-ink-muted uppercase tracking-wide">Categoria</th>
                    <th className="text-left px-5 py-3.5 text-xs font-semibold text-ink-muted uppercase tracking-wide">Subcategoria</th>
                    <th className="text-right px-5 py-3.5 text-xs font-semibold text-ink-muted uppercase tracking-wide">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-hairline">
                  {paged.map((exp) => (
                    <tr key={exp.idExpense} className="hover:bg-surface-1 transition-colors">
                      <td className="px-5 py-4 font-medium text-ink max-w-[220px] truncate">{exp.description}</td>
                      <td className="px-5 py-4 text-ink font-semibold whitespace-nowrap">
                        {formatCurrency(Number(exp.amount))}
                      </td>
                      <td className="px-5 py-4 text-ink-muted whitespace-nowrap">{formatDate(exp.date)}</td>
                      <td className="px-5 py-4">
                        <span className="inline-block text-xs font-medium bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                          {exp.category.name}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-ink-muted">{exp.subcategory.name}</td>
                      <td className="px-5 py-4">
                        {confirmDelete === exp.idExpense ? (
                          <div className="flex items-center justify-end gap-2">
                            <span className="text-xs text-ink-muted">Confirmar exclusão?</span>
                            <button
                              onClick={() => handleDelete(exp.idExpense)}
                              disabled={deleting === exp.idExpense}
                              className="text-xs font-semibold text-on-primary bg-error hover:bg-error/90 rounded-full px-3 py-1.5 active:scale-95 disabled:opacity-60 transition"
                            >
                              {deleting === exp.idExpense ? 'Excluindo...' : 'Sim'}
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
                            <button
                              onClick={() => modalsRef.current?.openEdit(exp)}
                              className="text-xs font-medium text-primary bg-primary/10 hover:bg-primary/20 rounded-full px-3 py-1.5 active:scale-95 transition"
                            >
                              Editar
                            </button>
                            <button
                              onClick={() => setConfirmDelete(exp.idExpense)}
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
                {expenses.length} {expenses.length === 1 ? 'lançamento' : 'lançamentos'} — página {page} de {totalPages}
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
                    className={`w-8 h-8 rounded-full text-xs font-medium transition-colors ${p === page ? 'bg-primary text-on-primary' : 'border border-hairline text-ink-muted hover:bg-surface-1'
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

      {showSharing && spreadsheet && (
        <SharingManager
          idSpreadsheet={spreadsheet.idSpreadsheet}
          spreadsheetName={spreadsheet.name}
          onClose={() => setShowSharing(false)}
        />
      )}
    </div>
  );
}
