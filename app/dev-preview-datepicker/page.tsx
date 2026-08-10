'use client';

import { useState } from 'react';
import DatePicker from '@/components/DatePicker';

const inputClass =
  'w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent dark:bg-brand-surface dark:border-brand-muted/30 dark:text-brand-fg dark:placeholder-brand-muted';

export default function DevPreviewDatePicker() {
  const [date, setDate] = useState('2026-08-09');
  const [start, setStart] = useState('2026-08-01');
  const [end, setEnd] = useState('2026-08-20');

  return (
    <div className="max-w-md mx-auto p-10 space-y-8 min-h-screen bg-[var(--background)]">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5 dark:text-brand-fg">Data</label>
        <DatePicker value={date} onChange={setDate} className={inputClass} />
      </div>
      <div className="flex gap-4">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1.5 dark:text-brand-fg">Data inicial</label>
          <DatePicker value={start} onChange={setStart} max={end} className={inputClass} />
        </div>
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1.5 dark:text-brand-fg">Data final</label>
          <DatePicker value={end} onChange={setEnd} min={start} className={inputClass} />
        </div>
      </div>
    </div>
  );
}
