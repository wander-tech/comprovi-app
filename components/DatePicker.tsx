'use client';

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

interface DatePickerProps {
  value: string;
  onChange: (value: string) => void;
  min?: string;
  max?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
}

const WEEKDAY_LABELS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
const MONTH_LABELS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

const TRIGGER_BASE =
  'w-full flex items-center justify-between gap-2 text-left disabled:cursor-not-allowed';

const PANEL_WIDTH = 320;
const VIEWPORT_MARGIN = 12;

function pad(n: number) {
  return String(n).padStart(2, '0');
}

function toISO(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function fromISO(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const [, y, m, d] = match;
  return new Date(Number(y), Number(m) - 1, Number(d));
}

function formatDisplay(value: string) {
  const date = fromISO(value);
  if (!date) return '';
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
}

export default function DatePicker({
  value,
  onChange,
  min,
  max,
  placeholder = 'Selecione',
  disabled = false,
  className = '',
  id,
}: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const today = useMemo(() => new Date(), []);
  const todayISO = useMemo(() => toISO(today), [today]);
  const selected = fromISO(value);
  const [viewDate, setViewDate] = useState(() => selected ?? today);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [panelStyle, setPanelStyle] = useState<React.CSSProperties>({});

  useEffect(() => {
    function handleOutsideClick(e: MouseEvent) {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      setOpen(false);
    }
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  useLayoutEffect(() => {
    if (!open) return;

    function updatePosition() {
      const trigger = triggerRef.current;
      if (!trigger) return;
      const rect = trigger.getBoundingClientRect();
      const panelWidth = Math.min(PANEL_WIDTH, window.innerWidth - VIEWPORT_MARGIN * 2);
      const panelHeight = panelRef.current?.offsetHeight ?? 340;

      const spaceBelow = window.innerHeight - rect.bottom;
      const openUpward = spaceBelow < panelHeight + VIEWPORT_MARGIN && rect.top > panelHeight + VIEWPORT_MARGIN;

      let left = rect.left;
      if (left + panelWidth > window.innerWidth - VIEWPORT_MARGIN) {
        left = window.innerWidth - VIEWPORT_MARGIN - panelWidth;
      }
      left = Math.max(VIEWPORT_MARGIN, left);

      setPanelStyle(
        openUpward
          ? { position: 'fixed', bottom: window.innerHeight - rect.top + 4, left, width: panelWidth, zIndex: 60 }
          : { position: 'fixed', top: rect.bottom + 4, left, width: panelWidth, zIndex: 60 },
      );
    }

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [open]);

  function openCalendar() {
    if (disabled) return;
    setViewDate(selected ?? today);
    setOpen(true);
  }

  function toggleCalendar() {
    if (open) setOpen(false);
    else openCalendar();
  }

  function changeMonth(delta: number) {
    setViewDate((d) => new Date(d.getFullYear(), d.getMonth() + delta, 1));
  }

  function selectDate(date: Date) {
    onChange(toISO(date));
    setOpen(false);
  }

  const isTodayDisabled = Boolean((min && todayISO < min) || (max && todayISO > max));

  const cells = useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const firstWeekday = new Date(year, month, 1).getDay();
    const start = new Date(year, month, 1 - firstWeekday);
    return Array.from({ length: 42 }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
  }, [viewDate]);

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        id={id}
        type="button"
        disabled={disabled}
        onClick={toggleCalendar}
        className={`${TRIGGER_BASE} ${className}`}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <span className={value ? '' : 'text-gray-400 dark:text-brand-muted'}>
          {value ? formatDisplay(value) : placeholder}
        </span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="w-4 h-4 shrink-0 text-gray-400 dark:text-brand-muted"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path strokeLinecap="round" d="M8 3v4M16 3v4M3 10h18" />
        </svg>
      </button>

      {open && createPortal(
        <div
          ref={panelRef}
          style={panelStyle}
          className="bg-white rounded-lg border border-gray-200 shadow-lg p-3 dark:bg-brand-surface dark:border-brand-muted/30"
        >
          <div className="flex items-center justify-between mb-2">
            <button
              type="button"
              onClick={() => changeMonth(-1)}
              className="p-1.5 rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors dark:text-brand-muted dark:hover:bg-brand-bg dark:hover:text-brand-fg"
              aria-label="Mês anterior"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span className="text-sm font-semibold text-gray-900 dark:text-brand-fg">
              {MONTH_LABELS[viewDate.getMonth()]} {viewDate.getFullYear()}
            </span>
            <button
              type="button"
              onClick={() => changeMonth(1)}
              className="p-1.5 rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors dark:text-brand-muted dark:hover:bg-brand-bg dark:hover:text-brand-fg"
              aria-label="Próximo mês"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          <div className="grid grid-cols-7 gap-y-1 text-center">
            {WEEKDAY_LABELS.map((label, i) => (
              <span key={i} className="text-[11px] font-medium text-gray-400 dark:text-brand-muted">
                {label}
              </span>
            ))}
            {cells.map((date) => {
              const iso = toISO(date);
              const isCurrentMonth = date.getMonth() === viewDate.getMonth();
              const isSelected = iso === value;
              const isToday = iso === todayISO;
              const isDisabled = Boolean((min && iso < min) || (max && iso > max));
              return (
                <button
                  key={iso}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => selectDate(date)}
                  className={`w-full aspect-square rounded-md text-xs flex items-center justify-center transition-colors ${isSelected
                    ? 'bg-brand-primary text-white font-semibold'
                    : isDisabled
                      ? 'text-gray-300 cursor-not-allowed dark:text-brand-muted/30'
                      : isCurrentMonth
                        ? 'text-gray-700 hover:bg-brand-primary/10 hover:text-brand-primary dark:text-brand-fg dark:hover:bg-brand-primary/20'
                        : 'text-gray-300 hover:bg-gray-50 dark:text-brand-muted/40 dark:hover:bg-brand-bg'
                    } ${isToday && !isSelected ? 'ring-1 ring-inset ring-brand-primary/50' : ''}`}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-100 dark:border-brand-muted/20">
            <button
              type="button"
              onClick={() => selectDate(today)}
              disabled={isTodayDisabled}
              className="text-xs font-medium text-brand-primary hover:underline disabled:text-gray-300 disabled:no-underline disabled:cursor-not-allowed dark:disabled:text-brand-muted/30"
            >
              Hoje
            </button>
            {value && (
              <button
                type="button"
                onClick={() => {
                  onChange('');
                  setOpen(false);
                }}
                className="text-xs font-medium text-gray-400 hover:text-gray-600 dark:text-brand-muted dark:hover:text-brand-fg"
              >
                Limpar
              </button>
            )}
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
