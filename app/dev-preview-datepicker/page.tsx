'use client';

import { useState } from 'react';
import DatePicker from '@/components/DatePicker';
import { format, startOfMonth, endOfMonth } from 'date-fns';

const inputClass =
  'w-full px-3.5 py-2.5 bg-canvas border border-hairline rounded-lg text-sm text-ink placeholder-ink-subtle focus:outline-none focus:ring-2 focus:ring-primary-focus focus:border-primary-focus';

export default function DevPreviewDatePicker() {
  const [date, setDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [start, setStart] = useState(() => format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [end, setEnd] = useState(() => format(endOfMonth(new Date()), 'yyyy-MM-dd'));

  return (
    <div className="max-w-md mx-auto p-10 space-y-8 min-h-screen bg-[var(--background)]">
      <div>
        <label className="block text-sm font-medium text-ink-muted mb-1.5">Data</label>
        <DatePicker value={date} onChange={setDate} className={inputClass} />
      </div>
      <div className="flex gap-4">
        <div className="flex-1">
          <label className="block text-sm font-medium text-ink-muted mb-1.5">Data inicial</label>
          <DatePicker value={start} onChange={setStart} max={end} className={inputClass} />
        </div>
        <div className="flex-1">
          <label className="block text-sm font-medium text-ink-muted mb-1.5">Data final</label>
          <DatePicker value={end} onChange={setEnd} min={start} className={inputClass} />
        </div>
      </div>
    </div>
  );
}
