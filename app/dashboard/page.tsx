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

// Apple's public iOS/macOS system-color palette, used as a categorical chart
// set (the source design doc has no data-viz palette of its own).
const COLORS = [
  '#0066cc', '#34c759', '#ff9500', '#ff3b30', '#af52de',
  '#30b0c7', '#ff2d55', '#ffcc00', '#5856d6', '#a2845e',
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

function buildRecent(expenses: DashboardExpense[], count = 3) {
  return [...expenses].sort((a, b) => b.date.localeCompare(a.date)).slice(0, count);
}

// ─── tooltip components ───────────────────────────────────────────────────────

function BarTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-canvas border border-hairline shadow-lg rounded-lg px-3 py-2 text-sm">
      {label && <p className="font-medium text-ink-muted mb-1">{label}</p>}
      <p className="text-primary font-semibold">{fmt(payload[0].value)}</p>
    </div>
  );
}

function PieTooltip({ active, payload }: { active?: boolean; payload?: Array<{ name: string; value: number; payload: { pct: number } }> }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-canvas border border-hairline shadow-lg rounded-lg px-3 py-2 text-sm">
      <p className="font-medium text-ink-muted">{payload[0].name}</p>
      <p className="text-primary font-semibold">{fmt(payload[0].value)}</p>
      <p className="text-ink-subtle text-xs">{payload[0].payload.pct.toFixed(1)}% do total</p>
    </div>
  );
}

// ─── sub-components ──────────────────────────────────────────────────────────

function MetricCard({
  label,
  value,
  sub,
  color = 'text-ink',
}: {
  label: string;
  value: string;
  sub?: string;
  color?: string;
}) {
  return (
    <div className="bg-canvas border border-hairline rounded-lg p-5">
      <p className="text-xs font-semibold text-ink-subtle uppercase tracking-wide mb-1">{label}</p>
      <p className={`text-xl sm:text-2xl font-semibold ${color} leading-tight break-words`}>{value}</p>
      {sub && <p className="text-xs text-ink-subtle mt-1">{sub}</p>}
    </div>
  );
}

function CategoryBar({ name, value, pct, color }: { name: string; value: number; pct: number; color: string }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
          <span className="text-ink-muted truncate">{name}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-2">
          <span className="text-ink-subtle">{pct.toFixed(1)}%</span>
          <span className="font-semibold text-ink w-24 text-right">{fmt(value)}</span>
        </div>
      </div>
      <div className="h-1.5 bg-surface-1 rounded-full overflow-hidden">
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
    if (sortField !== field) return <span className="text-ink-subtle ml-1">↕</span>;
    return <span className="text-primary ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>;
  }

  const inputClass = 'px-3 py-2 bg-canvas border border-hairline rounded-lg text-sm text-ink focus:outline-none focus:ring-2 focus:ring-primary-focus focus:border-primary-focus';

  return (
    <div className="bg-canvas border border-hairline rounded-lg overflow-hidden">
      {/* Filters */}
      <div className="p-4 border-b border-hairline flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink-subtle" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
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
            className="px-3 py-2 rounded-full text-sm text-ink-muted hover:text-ink border border-hairline hover:bg-surface-1 transition-colors"
          >
            Limpar
          </button>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-hairline border-b border-hairline">
              <th
                className="text-left px-5 py-3.5 text-xs font-semibold text-ink-muted uppercase tracking-wide cursor-pointer select-none hover:text-ink"
                onClick={() => toggleSort('date')}
              >
                Data <SortIcon field="date" />
              </th>
              <th className="text-left px-5 py-3.5 text-xs font-semibold text-ink-muted uppercase tracking-wide">Descrição</th>
              <th className="text-left px-5 py-3.5 text-xs font-semibold text-ink-muted uppercase tracking-wide">Categoria</th>
              <th className="text-left px-5 py-3.5 text-xs font-semibold text-ink-muted uppercase tracking-wide">Subcategoria</th>
              {spreadsheets.length > 1 && (
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-ink-muted uppercase tracking-wide">Planilha</th>
              )}
              <th
                className="text-right px-5 py-3.5 text-xs font-semibold text-ink-muted uppercase tracking-wide cursor-pointer select-none hover:text-ink"
                onClick={() => toggleSort('amount')}
              >
                Valor <SortIcon field="amount" />
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-hairline">
            {paged.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-10 text-center text-sm text-ink-subtle">
                  Nenhum lançamento encontrado.
                </td>
              </tr>
            ) : (
              paged.map((e) => (
                <tr key={e.idExpense} className="hover:bg-surface-1 transition-colors">
                  <td className="px-5 py-3.5 text-ink-muted whitespace-nowrap">{fmtDate(e.date)}</td>
                  <td className="px-5 py-3.5 text-ink font-medium max-w-xs truncate">{e.description}</td>
                  <td className="px-5 py-3.5 text-ink-muted">{e.category.name}</td>
                  <td className="px-5 py-3.5 text-ink-muted">{e.subcategory.name}</td>
                  {spreadsheets.length > 1 && (
                    <td className="px-5 py-3.5 text-ink-muted">{expenseMap.get(e.idExpense) ?? '—'}</td>
                  )}
                  <td className="px-5 py-3.5 text-right font-semibold text-error whitespace-nowrap">{fmt(e.amount)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-5 py-3.5 border-t border-hairline">
        <span className="text-xs text-ink-subtle">
          {filtered.length} {filtered.length === 1 ? 'lançamento' : 'lançamentos'}
          {filtered.length !== expenses.length && ` de ${expenses.length}`}
          {totalPages > 1 && ` — página ${page} de ${totalPages}`}
        </span>
        {totalPages > 1 && (
          <div className="flex items-center flex-wrap gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 rounded-full text-xs font-medium border border-hairline text-ink-muted hover:bg-surface-1 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Anterior
            </button>
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
              const p = totalPages <= 7 ? i + 1 : page <= 4 ? i + 1 : page >= totalPages - 3 ? totalPages - 6 + i : page - 3 + i;
              return (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`w-8 h-8 rounded-full text-xs font-medium transition-colors ${p === page ? 'bg-primary text-on-primary' : 'border border-hairline text-ink-muted hover:bg-surface-1'
                    }`}
                >
                  {p}
                </button>
              );
            })}
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1.5 rounded-full text-xs font-medium border border-hairline text-ink-muted hover:bg-surface-1 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
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
  const recentExpenses = useMemo(() => buildRecent(allExpenses), [allExpenses]);

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
          <h1 className="text-2xl font-semibold text-ink">Dashboard</h1>
        </div>
        <div className="flex flex-col lg:flex-row lg:items-end gap-4">
          <form onSubmit={applyFilter} className="flex flex-wrap items-end gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-ink-muted uppercase tracking-wide">Data inicial</label>
              <DatePicker
                value={pendingStart}
                onChange={setPendingStart}
                max={pendingEnd}
                className="px-3 py-2 bg-canvas border border-hairline rounded-lg text-sm text-ink focus:outline-none focus:ring-2 focus:ring-primary-focus focus:border-primary-focus"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-ink-muted uppercase tracking-wide">Data final</label>
              <DatePicker
                value={pendingEnd}
                onChange={setPendingEnd}
                min={pendingStart}
                className="px-3 py-2 bg-canvas border border-hairline rounded-lg text-sm text-ink focus:outline-none focus:ring-2 focus:ring-primary-focus focus:border-primary-focus"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 rounded-full bg-primary text-on-primary text-sm font-semibold hover:bg-primary-hover active:scale-95 focus:outline-none focus:ring-2 focus:ring-primary-focus focus:ring-offset-2 transition"
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
        <div className="px-4 py-3 bg-error/10 border border-error/30 text-error text-sm">{error}</div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-64 text-ink-subtle">
          <div className="flex flex-col items-center gap-3">
            <svg className="animate-spin w-8 h-8 text-primary" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            <span className="text-sm">Carregando dados...</span>
          </div>
        </div>
      ) : !hasData ? (
        <div className="flex flex-col items-center justify-center h-64 gap-3 bg-canvas border border-hairline rounded-lg">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-12 h-12 text-ink-subtle" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-ink-muted font-medium">Nenhum dado para o período selecionado.</p>
          <p className="text-ink-subtle text-sm">Ajuste o intervalo de datas ou adicione despesas</p>
        </div>
      ) : (
        <>
          {/* ── 6 metric cards ── */}
          <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            <MetricCard
              label="Total de Despesas"
              value={fmt(totalExpenses)}
              sub={`${fmtDate(startDate)} – ${fmtDate(endDate)}`}
              color="text-error"
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
              color="text-error"
            />
            <MetricCard
              label="Menor Despesa"
              value={fmt(minExpense)}
              color="text-success"
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
            <div className="bg-canvas border border-hairline rounded-lg p-5">
              <h2 className="text-sm font-semibold text-ink mb-4">Evolução Mensal de Despesas</h2>
              {monthlyData.length === 0 ? (
                <div className="flex items-center justify-center h-48 text-ink-subtle text-sm">
                  Sem dados mensais no período
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={monthlyData} margin={{ top: 20, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--hairline)" />
                    <XAxis dataKey="month" tick={{ fontSize: 12, fill: 'var(--ink-subtle)' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: 'var(--ink-subtle)' }} axisLine={false} tickLine={false} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} width={52} />
                    <Tooltip content={<BarTooltip />} />
                    <Bar dataKey="total" fill="var(--primary)" radius={[6, 6, 0, 0]} name="Despesas">
                      <LabelList
                        dataKey="total"
                        position="top"
                        formatter={(v: unknown) => {
                          const n = Number(v);
                          return n >= 1000 ? `R$${(n / 1000).toFixed(1)}k` : `R$${n}`;
                        }}
                        style={{ fontSize: 10, fill: 'var(--ink-subtle)' }}
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}

              <div className="mt-4 pt-4 border-t border-hairline">
                <h3 className="text-xs font-semibold text-ink-subtle uppercase tracking-wide mb-2">Últimos Lançamentos</h3>
                {recentExpenses.length === 0 ? (
                  <p className="text-sm text-ink-subtle">Nenhum lançamento no período</p>
                ) : (
                  <ul className="divide-y divide-hairline">
                    {recentExpenses.map((e) => (
                      <li key={e.idExpense} className="flex items-center justify-between gap-3 py-2 text-sm">
                        <div className="min-w-0">
                          <p className="text-ink font-medium truncate">{e.description}</p>
                          <p className="text-ink-subtle text-xs">{fmtDate(e.date)} · {e.category.name}</p>
                        </div>
                        <span className="font-semibold text-error whitespace-nowrap">{fmt(e.amount)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {/* Category donut + breakdown */}
            <div className="bg-canvas border border-hairline rounded-lg p-5">
              <h2 className="text-sm font-semibold text-ink mb-4">Distribuição por Categoria</h2>
              {categoryData.length === 0 ? (
                <div className="flex items-center justify-center h-48 text-ink-subtle text-sm">
                  Sem dados de categoria
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  <div className="h-[310px] sm:h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart margin={{ top: 0, right: 0, bottom: 8, left: 0 }}>
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
                          wrapperStyle={{ paddingTop: 16, lineHeight: '1.8em' }}
                          formatter={(v) => <span className="text-xs text-ink-muted">{v}</span>}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-2 pt-1 border-t border-hairline">
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
            <h2 className="text-sm font-semibold text-ink mb-3">Lançamentos</h2>
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
