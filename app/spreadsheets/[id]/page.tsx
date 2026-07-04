'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { getSpreadsheet, type Spreadsheet } from '@/lib/spreadsheets';
import {
  getExpenses,
  createExpense,
  updateExpense,
  deleteExpense,
  getCategories,
  getSubcategories,
  type Expense,
  type Category,
  type Subcategory,
} from '@/lib/expenses';

const PAGE_SIZE = 10;
const EMPTY_FORM = { description: '', amount: '', date: '', idCategory: '', idSubcategory: '' };

interface ModalState {
  mode: 'create' | 'edit';
  expense?: Expense;
  form: typeof EMPTY_FORM;
  saving: boolean;
  error: string;
}

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
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [modal, setModal] = useState<ModalState | null>(null);

  const load = useCallback(async () => {
    if (!idSpreadsheet) return;
    setLoading(true);
    setError('');
    try {
      const [sheet, expList, cats, subs] = await Promise.all([
        getSpreadsheet(idSpreadsheet),
        getExpenses(idSpreadsheet),
        getCategories(),
        getSubcategories(),
      ]);
      setSpreadsheet(sheet);
      setExpenses(expList);
      setCategories(cats);
      setSubcategories(subs);
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

  const filteredSubs = useMemo(
    () => subcategories.filter((s) => String(s.idCategory) === modal?.form.idCategory),
    [subcategories, modal?.form.idCategory],
  );

  const totalAmount = useMemo(
    () => expenses.reduce((sum, e) => sum + Number(e.amount), 0),
    [expenses],
  );

  function openCreate() {
    setModal({ mode: 'create', form: EMPTY_FORM, saving: false, error: '' });
  }

  function openEdit(e: Expense) {
    setModal({
      mode: 'edit',
      expense: e,
      form: {
        description: e.description,
        amount: String(e.amount),
        date: e.date.substring(0, 10),
        idCategory: String(e.idCategory),
        idSubcategory: String(e.idSubcategory),
      },
      saving: false,
      error: '',
    });
  }

  function updateField(field: keyof typeof EMPTY_FORM) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const value = e.target.value;
      setModal((prev) => {
        if (!prev) return prev;
        const updated = { ...prev, form: { ...prev.form, [field]: value } };
        if (field === 'idCategory') {
          updated.form.idSubcategory = '';
        }
        return updated;
      });
    };
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!modal) return;
    const { description, amount, date, idCategory, idSubcategory } = modal.form;
    if (!idCategory || !idSubcategory) {
      setModal((prev) => prev && { ...prev, error: 'Selecione a categoria e a subcategoria.' });
      return;
    }
    setModal((prev) => prev && { ...prev, saving: true, error: '' });
    try {
      const payload = {
        description,
        amount: Number(amount),
        date,
        idCategory: Number(idCategory),
        idSubcategory: Number(idSubcategory),
      };
      if (modal.mode === 'create') {
        const created = await createExpense(idSpreadsheet, payload);
        setExpenses((prev) => [created, ...prev]);
      } else if (modal.expense) {
        const updated = await updateExpense(idSpreadsheet, modal.expense.idExpense, payload);
        setExpenses((prev) => prev.map((ex) => ex.idExpense === updated.idExpense ? updated : ex));
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

  const inputClass =
    'w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent';

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/spreadsheets"
              className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              Planilhas
            </Link>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            {spreadsheet ? spreadsheet.name : 'Carregando...'}
          </h1>
          {spreadsheet?.status && (
            <span className="inline-block mt-1 text-xs font-medium bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
              {spreadsheet.status.name}
            </span>
          )}
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Novo gasto
        </button>
      </div>

      {/* Summary card */}
      {!loading && expenses.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-5 py-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Total de gastos</p>
            <p className="text-xl font-bold text-gray-900 mt-1">{formatCurrency(totalAmount)}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-5 py-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Lançamentos</p>
            <p className="text-xl font-bold text-gray-900 mt-1">{expenses.length}</p>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48 text-gray-400 text-sm">Carregando...</div>
        ) : expenses.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-2">
            <p className="text-gray-400 text-sm">Nenhum gasto registrado nesta planilha.</p>
            <button onClick={openCreate} className="text-sm text-blue-600 hover:text-blue-700 font-medium">
              Adicionar primeiro gasto
            </button>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Descrição</th>
                    <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Valor</th>
                    <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Data</th>
                    <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Categoria</th>
                    <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Subcategoria</th>
                    <th className="text-right px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {paged.map((exp) => (
                    <tr key={exp.idExpense} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-4 font-medium text-gray-900">{exp.description}</td>
                      <td className="px-5 py-4 text-gray-900 font-semibold whitespace-nowrap">
                        {formatCurrency(Number(exp.amount))}
                      </td>
                      <td className="px-5 py-4 text-gray-500 whitespace-nowrap">{formatDate(exp.date)}</td>
                      <td className="px-5 py-4">
                        <span className="inline-block text-xs font-medium bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                          {exp.category.name}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-gray-500">{exp.subcategory.name}</td>
                      <td className="px-5 py-4">
                        {confirmDelete === exp.idExpense ? (
                          <div className="flex items-center justify-end gap-2">
                            <span className="text-xs text-gray-500">Confirmar exclusão?</span>
                            <button
                              onClick={() => handleDelete(exp.idExpense)}
                              disabled={deleting === exp.idExpense}
                              className="text-xs font-semibold text-white bg-red-600 hover:bg-red-700 px-3 py-1.5 rounded-lg disabled:opacity-60 transition-colors"
                            >
                              {deleting === exp.idExpense ? 'Excluindo...' : 'Sim'}
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
                            <button
                              onClick={() => openEdit(exp)}
                              className="text-xs font-medium text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors"
                            >
                              Editar
                            </button>
                            <button
                              onClick={() => setConfirmDelete(exp.idExpense)}
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
                {expenses.length} {expenses.length === 1 ? 'lançamento' : 'lançamentos'} — página {page} de {totalPages}
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
                      p === page ? 'bg-blue-600 text-white' : 'border border-gray-200 text-gray-600 hover:bg-gray-50'
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
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-gray-900">
                {modal.mode === 'create' ? 'Novo gasto' : 'Editar gasto'}
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
                  Descrição <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={modal.form.description}
                  onChange={updateField('description')}
                  required
                  placeholder="Ex: Aluguel de março"
                  className={inputClass}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Valor (R$) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={modal.form.amount}
                    onChange={updateField('amount')}
                    required
                    placeholder="0,00"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Data <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={modal.form.date}
                    onChange={updateField('date')}
                    required
                    className={inputClass}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Categoria <span className="text-red-500">*</span>
                </label>
                <select
                  value={modal.form.idCategory}
                  onChange={updateField('idCategory')}
                  required
                  className={inputClass}
                >
                  <option value="">Selecione a categoria</option>
                  {categories.map((c) => (
                    <option key={c.idCategory} value={c.idCategory}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Subcategoria <span className="text-red-500">*</span>
                </label>
                <select
                  value={modal.form.idSubcategory}
                  onChange={updateField('idSubcategory')}
                  required
                  disabled={!modal.form.idCategory}
                  className={`${inputClass} disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed`}
                >
                  <option value="">
                    {modal.form.idCategory ? 'Selecione a subcategoria' : 'Selecione uma categoria primeiro'}
                  </option>
                  {filteredSubs.map((s) => (
                    <option key={s.idSubcategory} value={s.idSubcategory}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={modal.saving}
                  className="flex-1 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                >
                  {modal.saving
                    ? modal.mode === 'create' ? 'Salvando...' : 'Salvando...'
                    : modal.mode === 'create' ? 'Adicionar gasto' : 'Salvar alterações'}
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
