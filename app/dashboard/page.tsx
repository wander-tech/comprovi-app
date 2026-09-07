'use client';

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LabelList,
} from 'recharts';
import SearchableSelect from '@/components/SearchableSelect';
import DatePicker from '@/components/DatePicker';
import ExpenseModals, { type ExpenseModalsHandle } from '@/components/ExpenseModals';
import ExpenseActionButtons from '@/components/ExpenseActionButtons';
import { getDashboard, type DashboardResponse, type DashboardExpense, type DashboardSpreadsheet } from '@/lib/dashboard';

// ─── constants ───────────────────────────────────────────────────────────────

const COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#06b6d4', '#f97316', '#84cc16', '#ec4899', '#6366f1',
];

const PAGE_SIZE = 10;

// ─── helpers ─────────────────────────────────────────────────────────────────

function fmt(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR');
}

function monthLabel(yearMonth: string) {
  const [y, m] = yearMonth.split('-');
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString('pt-BR', {
    month: 'short',
    year: '2-digit',
  });
}

function getDefaultDates() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
  };
}

function buildMonthly(expenses: DashboardExpense[]) {
  const map = new Map<string, number>();
  for (const e of expenses) {
    const ym = e.date.slice(0, 7);
    map.set(ym, (map.get(ym) ?? 0) + e.amount);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([ym, total]) => ({ month: monthLabel(ym), total }));
}

function buildCategories(expenses: DashboardExpense[]) {
  const map = new Map<string, number>();
  for (const e of expenses) map.set(e.category.name, (map.get(e.category.name) ?? 0) + e.amount);
  return Array.from(map.entries())
    .sort(([, a], [, b]) => b - a)
    .map(([name, value]) => ({ name, value }));
}

function buildSubcategories(expenses: DashboardExpense[]) {
  const map = new Map<string, number>();
  for (const e of expenses) map.set(e.subcategory.name, (map.get(e.subcategory.name) ?? 0) + e.amount);
  return Array.from(map.entries())
    .sort(([, a], [, b]) => b - a)
    .map(([name, value]) => ({ name, value }));
}

// ─── tooltip components ───────────────────────────────────────────────────────

function BarTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2 text-sm dark:border-brand-muted/30 dark:bg-brand-surface">
      {label && <p className="font-medium text-gray-700 mb-1 dark:text-brand-fg">{label}</p>}
      <p className="text-brand-primary font-semibold dark:text-brand-primary">{fmt(payload[0].value)}</p>
    </div>
  );
}

function PieTooltip({ active, payload }: { active?: boolean; payload?: Array<{ name: string; value: number; payload: { pct: number } }> }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2 text-sm dark:border-brand-muted/30 dark:bg-brand-surface">
      <p className="font-medium text-gray-700 dark:text-brand-fg">{payload[0].name}</p>
      <p className="text-brand-primary font-semibold dark:text-brand-primary">{fmt(payload[0].value)}</p>
      <p className="text-gray-400 text-xs dark:text-brand-muted">{payload[0].payload.pct.toFixed(1)}% do total</p>
    </div>
  );
}

// ─── sub-components ──────────────────────────────────────────────────────────

function MetricCard({
  label,
  value,
  sub,
  color = 'text-gray-900 dark:text-brand-fg',
}: {
  label: string;
  value: string;
  sub?: string;
  color?: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 dark:border-brand-muted/20 dark:bg-brand-surface">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1 dark:text-brand-muted">{label}</p>
      <p className={`text-xl sm:text-2xl font-bold ${color} leading-tight break-words`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1 dark:text-brand-muted">{sub}</p>}
    </div>
  );
}

function CategoryBar({ name, value, pct, color }: { name: string; value: number; pct: number; color: string }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
          <span className="text-gray-600 truncate dark:text-brand-muted">{name}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-2">
          <span className="text-gray-400 dark:text-brand-muted">{pct.toFixed(1)}%</span>
          <span className="font-semibold text-gray-800 w-24 text-right dark:text-brand-fg">{fmt(value)}</span>
        </div>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden dark:bg-brand-surface">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}


function ExpensesTable({
  expenses,
  spreadsheets,
}: {
  expenses: DashboardExpense[];
  spreadsheets: DashboardSpreadsheet[];
}) {
  const [search, setSearch] = useState('');
  const [filterSheet, setFilterSheet] = useState('');
  const [filterCat, setFilterCat] = useState('');
  const [sortField, setSortField] = useState<'date' | 'amount'>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);

  const expenseMap = useMemo(() => {
    const map = new Map<number, string>();
    for (const s of spreadsheets) {
      for (const e of s.expenses) map.set(e.idExpense, s.name);
    }
    return map;
  }, [spreadsheets]);

  const categories = useMemo(() => {
    const set = new Set(expenses.map((e) => e.category.name));
    return Array.from(set).sort();
  }, [expenses]);

  const sheetOptions = useMemo(() => spreadsheets.map((s) => s.name), [spreadsheets]);

  function toggleSort(field: 'date' | 'amount') {
    if (sortField === field) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortField(field); setSortDir('desc'); }
    setPage(1);
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return expenses.filter((e) => {
      if (q && !e.description.toLowerCase().includes(q) && !e.category.name.toLowerCase().includes(q)) return false;
      if (filterSheet && expenseMap.get(e.idExpense) !== filterSheet) return false;
      if (filterCat && e.category.name !== filterCat) return false;
      return true;
    });
  }, [expenses, search, filterSheet, filterCat, expenseMap]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      if (sortField === 'date') {
        const diff = a.date.localeCompare(b.date);
        return sortDir === 'asc' ? diff : -diff;
      }
      return sortDir === 'asc' ? a.amount - b.amount : b.amount - a.amount;
    });
  }, [filtered, sortField, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const paged = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function SortIcon({ field }: { field: 'date' | 'amount' }) {
    if (sortField !== field) return <span className="text-gray-300 ml-1 dark:text-brand-muted">↕</span>;
    return <span className="text-brand-primary ml-1 dark:text-brand-primary">{sortDir === 'asc' ? '↑' : '↓'}</span>;
  }

  const inputClass = 'px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent bg-white dark:bg-brand-surface dark:border-brand-muted/30 dark:text-brand-fg';

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden dark:border-brand-muted/20 dark:bg-brand-surface">
      {/* Filters */}
      <div className="p-4 border-b border-gray-100 flex flex-wrap gap-3 dark:border-brand-muted/20">
        <div className="relative flex-1 min-w-48">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-brand-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Buscar descrição ou categoria..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className={`${inputClass} pl-9 w-full`}
          />
        </div>
        {sheetOptions.length > 1 && (
          <div className="w-44">
            <SearchableSelect
              value={filterSheet}
              onChange={(v) => { setFilterSheet(v); setPage(1); }}
              options={sheetOptions.map((n) => ({ value: n, label: n }))}
              emptyOptionLabel="Todas as planilhas"
              searchPlaceholder="Buscar planilha..."
              className={inputClass}
            />
          </div>
        )}
        <div className="w-44">
          <SearchableSelect
            value={filterCat}
            onChange={(v) => { setFilterCat(v); setPage(1); }}
            options={categories.map((c) => ({ value: c, label: c }))}
            emptyOptionLabel="Todas as categorias"
            searchPlaceholder="Buscar categoria..."
            className={inputClass}
          />
        </div>
        {(search || filterSheet || filterCat) && (
          <button
            onClick={() => { setSearch(''); setFilterSheet(''); setFilterCat(''); setPage(1); }}
            className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors dark:hover:text-brand-fg dark:hover:bg-brand-surface dark:border-brand-muted/30 dark:text-brand-muted"
          >
            Limpar
          </button>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100 dark:border-brand-muted/20 dark:bg-brand-surface">
              <th
                className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer select-none hover:text-gray-700 dark:hover:text-brand-fg dark:text-brand-muted"
                onClick={() => toggleSort('date')}
              >
                Data <SortIcon field="date" />
              </th>
              <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide dark:text-brand-muted">Descrição</th>
              <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide dark:text-brand-muted">Categoria</th>
              <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide dark:text-brand-muted">Subcategoria</th>
              {spreadsheets.length > 1 && (
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide dark:text-brand-muted">Planilha</th>
              )}
              <th
                className="text-right px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer select-none hover:text-gray-700 dark:hover:text-brand-fg dark:text-brand-muted"
                onClick={() => toggleSort('amount')}
              >
                Valor <SortIcon field="amount" />
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 dark:divide-brand-muted/20">
            {paged.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-10 text-center text-sm text-gray-400 dark:text-brand-muted">
                  Nenhum lançamento encontrado.
                </td>
              </tr>
            ) : (
              paged.map((e) => (
                <tr key={e.idExpense} className="hover:bg-gray-50 transition-colors dark:hover:bg-brand-surface">
                  <td className="px-5 py-3.5 text-gray-500 whitespace-nowrap dark:text-brand-muted">{fmtDate(e.date)}</td>
                  <td className="px-5 py-3.5 text-gray-900 font-medium max-w-xs truncate dark:text-brand-fg">{e.description}</td>
                  <td className="px-5 py-3.5 text-gray-600 dark:text-brand-muted">{e.category.name}</td>
                  <td className="px-5 py-3.5 text-gray-500 dark:text-brand-muted">{e.subcategory.name}</td>
                  {spreadsheets.length > 1 && (
                    <td className="px-5 py-3.5 text-gray-500 dark:text-brand-muted">{expenseMap.get(e.idExpense) ?? '—'}</td>
                  )}
                  <td className="px-5 py-3.5 text-right font-semibold text-red-600 whitespace-nowrap dark:text-red-400">{fmt(e.amount)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-5 py-3.5 border-t border-gray-100 dark:border-brand-muted/20">
        <span className="text-xs text-gray-400 dark:text-brand-muted">
          {filtered.length} {filtered.length === 1 ? 'lançamento' : 'lançamentos'}
          {filtered.length !== expenses.length && ` de ${expenses.length}`}
          {totalPages > 1 && ` — página ${page} de ${totalPages}`}
        </span>
        {totalPages > 1 && (
          <div className="flex items-center flex-wrap gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors dark:hover:bg-brand-surface dark:border-brand-muted/30 dark:text-brand-muted"
            >
              Anterior
            </button>
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
              const p = totalPages <= 7 ? i + 1 : page <= 4 ? i + 1 : page >= totalPages - 3 ? totalPages - 6 + i : page - 3 + i;
              return (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`w-8 h-8 text-xs font-medium rounded-lg transition-colors ${p === page ? 'bg-brand-primary text-white' : 'border border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-brand-muted/30 dark:text-brand-muted dark:hover:bg-brand-surface'
                    }`}
                >
                  {p}
                </button>
              );
            })}
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors dark:hover:bg-brand-surface dark:border-brand-muted/30 dark:text-brand-muted"
            >
              Próxima
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── main page ────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const defaults = useMemo(getDefaultDates, []);
  const [startDate, setStartDate] = useState(defaults.startDate);
  const [endDate, setEndDate] = useState(defaults.endDate);
  const [pendingStart, setPendingStart] = useState(defaults.startDate);
  const [pendingEnd, setPendingEnd] = useState(defaults.endDate);
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const modalsRef = useRef<ExpenseModalsHandle>(null);

  const load = useCallback(async (start: string, end: string) => {
    setLoading(true);
    setError('');
    setExpandedId(null);
    try {
      setData(await getDashboard(start, end));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(startDate, endDate); }, [load, startDate, endDate]);

  function applyFilter(e: React.FormEvent) {
    e.preventDefault();
    setStartDate(pendingStart);
    setEndDate(pendingEnd);
  }

  const spreadsheets = data?.spreadsheets ?? [];
  const allExpenses = useMemo(() => spreadsheets.flatMap((s) => s.expenses), [spreadsheets]);

  const totalExpenses = useMemo(() => allExpenses.reduce((a, e) => a + e.amount, 0), [allExpenses]);
  const maxExpense = useMemo(() => allExpenses.length ? Math.max(...allExpenses.map((e) => e.amount)) : 0, [allExpenses]);
  const minExpense = useMemo(() => allExpenses.length ? Math.min(...allExpenses.map((e) => e.amount)) : 0, [allExpenses]);
  const avgExpense = allExpenses.length ? totalExpenses / allExpenses.length : 0;
  const categoryCount = useMemo(() => new Set(allExpenses.map((e) => e.category.name)).size, [allExpenses]);

  const monthlyData = useMemo(() => buildMonthly(allExpenses), [allExpenses]);

  const categoryData = useMemo(() => {
    const cats = buildCategories(allExpenses);
    const total = cats.reduce((a, c) => a + c.value, 0);
    return cats.map((c) => ({ ...c, pct: total ? (c.value / total) * 100 : 0 }));
  }, [allExpenses]);

  const hasData = spreadsheets.length > 0 && allExpenses.length > 0;

  const expandedSheet = useMemo(
    () => spreadsheets.find((s) => s.idSpreadsheet === expandedId) ?? null,
    [spreadsheets, expandedId],
  );

  function toggleExpand(id: number) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      {/* ── Header + filter ── */}
      <div className="flex flex-col sm:flex-row sm:items-end gap-4 justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-brand-fg">Dashboard</h1>
        </div>
        <div className="flex flex-col lg:flex-row lg:items-end gap-4">
          <form onSubmit={applyFilter} className="flex flex-wrap items-end gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide dark:text-brand-muted">Data inicial</label>
              <DatePicker
                value={pendingStart}
                onChange={setPendingStart}
                max={pendingEnd}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent dark:border-brand-muted/30 dark:text-brand-fg dark:bg-brand-surface"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide dark:text-brand-muted">Data final</label>
              <DatePicker
                value={pendingEnd}
                onChange={setPendingEnd}
                min={pendingStart}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent dark:border-brand-muted/30 dark:text-brand-fg dark:bg-brand-surface"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-brand-primary text-white text-sm font-semibold rounded-lg hover:bg-brand-primary/90 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:ring-offset-2 transition-colors"
            >
              Aplicar
            </button>
          </form>
          <ExpenseActionButtons
            onImportReceipt={() => modalsRef.current?.openReceiptImport()}
            onNewExpense={() => modalsRef.current?.openCreate()}
          />
        </div>
      </div>

      {error && (
        <div className="px-4 py-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm dark:border-red-900 dark:text-red-400 dark:bg-red-950/40">{error}</div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-64 text-gray-400 dark:text-brand-muted">
          <div className="flex flex-col items-center gap-3">
            <svg className="animate-spin w-8 h-8 text-brand-primary dark:text-brand-primary" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            <span className="text-sm">Carregando dados...</span>
          </div>
        </div>
      ) : !hasData ? (
        <div className="flex flex-col items-center justify-center h-64 gap-3 bg-white rounded-2xl border border-gray-100 shadow-sm dark:border-brand-muted/20 dark:bg-brand-surface">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-12 h-12 text-gray-300 dark:text-brand-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-gray-500 font-medium dark:text-brand-muted">Nenhum dado para o período selecionado.</p>
          <p className="text-gray-400 text-sm dark:text-brand-muted">Ajuste o intervalo de datas ou adicione despesas</p>
        </div>
      ) : (
        <>
          {/* ── 6 metric cards ── */}
          <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            <MetricCard
              label="Total de Despesas"
              value={fmt(totalExpenses)}
              sub={`${fmtDate(startDate)} – ${fmtDate(endDate)}`}
              color="text-red-600 dark:text-red-400"
            />
            <MetricCard
              label="Lançamentos"
              value={String(allExpenses.length)}
              sub={`em ${spreadsheets.length} planilha${spreadsheets.length !== 1 ? 's' : ''}`}
            />
            <MetricCard
              label="Categorias"
              value={String(categoryCount)}
              sub="categorias distintas"
            />
            <MetricCard
              label="Maior Despesa"
              value={fmt(maxExpense)}
              color="text-red-500 dark:text-red-400"
            />
            <MetricCard
              label="Menor Despesa"
              value={fmt(minExpense)}
              color="text-green-600 dark:text-green-400"
            />
            <MetricCard
              label="Ticket Médio"
              value={fmt(avgExpense)}
              sub="por lançamento"
            />
          </div>

          {/* ── Charts ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Monthly bar chart */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 dark:border-brand-muted/20 dark:bg-brand-surface">
              <h2 className="text-sm font-semibold text-gray-700 mb-4 dark:text-brand-fg">Evolução Mensal de Despesas</h2>
              {monthlyData.length === 0 ? (
                <div className="flex items-center justify-center h-48 text-gray-400 text-sm dark:text-brand-muted">
                  Sem dados mensais no período
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={monthlyData} margin={{ top: 20, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.25)" />
                    <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} width={52} />
                    <Tooltip content={<BarTooltip />} />
                    <Bar dataKey="total" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Despesas">
                      <LabelList
                        dataKey="total"
                        position="top"
                        formatter={(v: unknown) => {
                          const n = Number(v);
                          return n >= 1000 ? `R$${(n / 1000).toFixed(1)}k` : `R$${n}`;
                        }}
                        style={{ fontSize: 10, fill: '#6b7280' }}
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Category donut + breakdown */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 dark:border-brand-muted/20 dark:bg-brand-surface">
              <h2 className="text-sm font-semibold text-gray-700 mb-4 dark:text-brand-fg">Distribuição por Categoria</h2>
              {categoryData.length === 0 ? (
                <div className="flex items-center justify-center h-48 text-gray-400 text-sm dark:text-brand-muted">
                  Sem dados de categoria
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={85}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {categoryData.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip content={<PieTooltip />} />
                      <Legend
                        iconType="circle"
                        iconSize={8}
                        formatter={(v) => <span className="text-xs text-gray-600 dark:text-brand-muted">{v}</span>}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-2 pt-1 border-t border-gray-100 dark:border-brand-muted/20">
                    {categoryData.map(({ name, value, pct }, i) => (
                      <CategoryBar key={name} name={name} value={value} pct={pct} color={COLORS[i % COLORS.length]} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>



          {/* ── Expenses table ── */}
          <div>
            <h2 className="text-sm font-semibold text-gray-700 mb-3 dark:text-brand-fg">Lançamentos</h2>
            <ExpensesTable expenses={allExpenses} spreadsheets={spreadsheets} />
          </div>
        </>
      )}

      <ExpenseModals
        ref={modalsRef}
        spreadsheets={spreadsheets}
        onExpenseCreated={() => load(startDate, endDate)}
      />
    </div>
  );
}
