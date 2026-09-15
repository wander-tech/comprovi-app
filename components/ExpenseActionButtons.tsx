'use client';

interface ExpenseActionButtonsProps {
  onImportReceipt: () => void;
  onNewExpense: () => void;
}

export default function ExpenseActionButtons({ onImportReceipt, onNewExpense }: ExpenseActionButtonsProps) {
  return (
    <div className="flex items-center gap-2 shrink-0">
      <button
        onClick={onImportReceipt}
        className="flex items-center justify-center gap-2 px-4 py-2.5 bg-canvas text-primary border border-primary rounded-full text-sm font-semibold hover:bg-primary/5 active:scale-95 focus:outline-none focus:ring-2 focus:ring-primary-focus focus:ring-offset-2 transition whitespace-nowrap"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
        </svg>
        Importar comprovante
      </button>
      <button
        onClick={onNewExpense}
        className="flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-on-primary rounded-full text-sm font-semibold hover:bg-primary-hover active:scale-95 focus:outline-none focus:ring-2 focus:ring-primary-focus focus:ring-offset-2 transition whitespace-nowrap"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
        Novo gasto
      </button>
    </div>
  );
}
