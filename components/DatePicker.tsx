'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { addDays, addMonths, format, getDay, isValid, parse, startOfMonth, subDays } from 'date-fns';
import { useFloatingPosition } from './useFloatingPosition';

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

function toISO(date: Date) {
  return format(date, 'yyyy-MM-dd');
}

function fromISO(value: string): Date | null {
  if (!value) return null;
  const date = parse(value, 'yyyy-MM-dd', new Date());
  return isValid(date) ? date : null;
}

function formatDisplay(value: string) {
  const date = fromISO(value);
  return date ? format(date, 'dd/MM/yyyy') : '';
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
  const panelStyle = useFloatingPosition({ open, triggerRef, panelRef, width: PANEL_WIDTH });

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
    setViewDate((d) => startOfMonth(addMonths(d, delta)));
  }

  function selectDate(date: Date) {
    onChange(toISO(date));
    setOpen(false);
  }

  const isTodayDisabled = Boolean((min && todayISO < min) || (max && todayISO > max));

  const cells = useMemo(() => {
    const monthStart = startOfMonth(viewDate);
    const start = subDays(monthStart, getDay(monthStart));
    return Array.from({ length: 42 }, (_, i) => addDays(start, i));
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
        <span className={value ? '' : 'text-ink-subtle'}>
          {value ? formatDisplay(value) : placeholder}
        </span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="w-4 h-4 shrink-0 text-ink-subtle"
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
          className="overflow-y-auto bg-canvas border border-hairline shadow-lg rounded-xl p-3"
        >
          <div className="flex items-center justify-between mb-2">
            <button
              type="button"
              onClick={() => changeMonth(-1)}
              className="p-1.5 rounded-full text-ink-muted hover:bg-surface-1 hover:text-ink transition-colors"
              aria-label="Mês anterior"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span className="text-sm font-semibold text-ink">
              {MONTH_LABELS[viewDate.getMonth()]} {viewDate.getFullYear()}
            </span>
            <button
              type="button"
              onClick={() => changeMonth(1)}
              className="p-1.5 rounded-full text-ink-muted hover:bg-surface-1 hover:text-ink transition-colors"
              aria-label="Próximo mês"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          <div className="grid grid-cols-7 gap-y-1 text-center">
            {WEEKDAY_LABELS.map((label, i) => (
              <span key={i} className="text-[11px] font-medium text-ink-subtle">
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
                  className={`w-full aspect-square rounded-full text-xs flex items-center justify-center transition-colors ${isSelected
                    ? 'bg-primary text-on-primary font-semibold'
                    : isDisabled
                      ? 'text-ink-subtle cursor-not-allowed'
                      : isCurrentMonth
                        ? 'text-ink-muted hover:bg-primary/10 hover:text-primary'
                        : 'text-ink-subtle hover:bg-surface-1'
                    } ${isToday && !isSelected ? 'ring-1 ring-inset ring-primary/50' : ''}`}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-between mt-3 pt-2 border-t border-hairline">
            <button
              type="button"
              onClick={() => selectDate(today)}
              disabled={isTodayDisabled}
              className="text-xs font-medium text-primary hover:underline disabled:text-ink-subtle disabled:no-underline disabled:cursor-not-allowed"
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
                className="text-xs font-medium text-ink-subtle hover:text-ink"
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
