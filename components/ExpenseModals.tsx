'use client';

import { forwardRef, useEffect, useImperativeHandle, useMemo, useState } from 'react';
import SearchableSelect from './SearchableSelect';
import DatePicker from './DatePicker';
import {
  createExpense,
  updateExpense,
  createExpenseFromReceipt,
  getCategories,
  getSubcategories,
  createCategory,
  createSubcategory,
  type Expense,
  type Category,
  type Subcategory,
} from '@/lib/expenses';

export interface SpreadsheetOption {
  idSpreadsheet: number;
  name: string;
}

const EMPTY_FORM = { idSpreadsheet: '', description: '', amount: '', date: '', idCategory: '', idSubcategory: '' };

interface ModalState {
  mode: 'create' | 'edit';
  expense?: Expense;
  form: typeof EMPTY_FORM;
  saving: boolean;
  error: string;
}

interface ReceiptModalState {
  idSpreadsheet: string;
  file: File | null;
  saving: boolean;
  error: string;
  success: string;
}

interface InlineCreateState {
  name: string;
  saving: boolean;
  error: string;
}

export interface ExpenseModalsHandle {
  openCreate: () => void;
  openEdit: (expense: Expense) => void;
  openReceiptImport: () => void;
}

interface ExpenseModalsProps {
  /** Spreadsheets the user can pick from. Ignored when `lockedSpreadsheetId` is set. */
  spreadsheets: SpreadsheetOption[];
  /** When set, the spreadsheet picker is hidden and every action targets this id. */
  lockedSpreadsheetId?: number;
  onExpenseCreated?: (expense: Expense) => void;
  onExpenseUpdated?: (expense: Expense) => void;
}

const inputClass =
  'w-full px-3.5 py-2.5 bg-canvas border border-hairline rounded-lg text-base sm:text-sm text-ink placeholder-ink-subtle focus:outline-none focus:ring-2 focus:ring-primary-focus focus:border-primary-focus';

const labelClass = 'block text-sm font-medium text-ink-muted mb-1.5';
const linkButtonClass = 'text-xs font-medium text-primary hover:underline';
const errorBannerClass = 'mb-4 px-4 py-3 bg-error/10 border border-error/30 text-error text-sm';
const successBannerClass = 'mb-4 px-4 py-3 bg-success/10 border border-success/30 text-success text-sm';
const inlineAddButtonClass =
  'px-3 py-2.5 rounded-full bg-primary text-on-primary text-sm font-medium hover:bg-primary-hover active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed transition';
const inlineCancelButtonClass =
  'px-3 py-2.5 rounded-full bg-canvas text-ink-muted text-sm font-medium border border-hairline hover:bg-surface-1 active:scale-95 transition';
const modalCancelButtonClass =
  'w-full sm:w-auto sm:px-5 py-2.5 rounded-full bg-canvas text-ink-muted text-sm font-medium border border-hairline hover:bg-surface-1 active:scale-95 transition';
const modalSubmitButtonClass =
  'flex-1 py-2.5 rounded-full bg-primary text-on-primary text-sm font-semibold hover:bg-primary-hover active:scale-95 focus:outline-none focus:ring-2 focus:ring-primary-focus focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed transition';

const ExpenseModals = forwardRef<ExpenseModalsHandle, ExpenseModalsProps>(function ExpenseModals(
  { spreadsheets, lockedSpreadsheetId, onExpenseCreated, onExpenseUpdated },
  ref,
) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [modal, setModal] = useState<ModalState | null>(null);
  const [receiptModal, setReceiptModal] = useState<ReceiptModalState | null>(null);
  const [creatingCategory, setCreatingCategory] = useState<InlineCreateState | null>(null);
  const [creatingSubcategory, setCreatingSubcategory] = useState<InlineCreateState | null>(null);

  useEffect(() => {
    getCategories().then(setCategories).catch(() => {});
    getSubcategories().then(setSubcategories).catch(() => {});
  }, []);

  const filteredSubs = useMemo(
    () => subcategories.filter((s) => String(s.idCategory) === modal?.form.idCategory),
    [subcategories, modal?.form.idCategory],
  );

  const spreadsheetOptions = useMemo(
    () => spreadsheets.map((s) => ({ value: String(s.idSpreadsheet), label: s.name })),
    [spreadsheets],
  );

  let defaultSpreadsheetId = '';
  if (lockedSpreadsheetId) {
    defaultSpreadsheetId = String(lockedSpreadsheetId);
  } else if (spreadsheets.length === 1) {
    defaultSpreadsheetId = String(spreadsheets[0].idSpreadsheet);
  }

  useImperativeHandle(ref, () => ({
    openCreate() {
      setModal({
        mode: 'create',
        form: { ...EMPTY_FORM, idSpreadsheet: defaultSpreadsheetId },
        saving: false,
        error: '',
      });
      setCreatingCategory(null);
      setCreatingSubcategory(null);
    },
    openEdit(expense: Expense) {
      setModal({
        mode: 'edit',
        expense,
        form: {
          idSpreadsheet: String(expense.idSpreadsheet),
          description: expense.description,
          amount: String(expense.amount),
          date: expense.date.substring(0, 10),
          idCategory: String(expense.idCategory),
          idSubcategory: String(expense.idSubcategory),
        },
        saving: false,
        error: '',
      });
      setCreatingCategory(null);
      setCreatingSubcategory(null);
    },
    openReceiptImport() {
      setReceiptModal({
        idSpreadsheet: defaultSpreadsheetId,
        file: null,
        saving: false,
        error: '',
        success: '',
      });
    },
  }), [defaultSpreadsheetId]);

  function updateField(field: keyof typeof EMPTY_FORM) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setModal((prev) => {
        if (!prev) return prev;
        const updated = { ...prev, form: { ...prev.form, [field]: value } };
        if (field === 'idCategory') updated.form.idSubcategory = '';
        return updated;
      });
    };
  }

  function updateDate(value: string) {
    setModal((prev) => (prev ? { ...prev, form: { ...prev.form, date: value } } : prev));
  }

  function updateSpreadsheet(value: string) {
    setModal((prev) => (prev ? { ...prev, form: { ...prev.form, idSpreadsheet: value } } : prev));
  }

  function updateCategory(value: string) {
    setModal((prev) => (prev ? { ...prev, form: { ...prev.form, idCategory: value, idSubcategory: '' } } : prev));
    setCreatingSubcategory(null);
  }

  function updateSubcategory(value: string) {
    setModal((prev) => (prev ? { ...prev, form: { ...prev.form, idSubcategory: value } } : prev));
  }

  function openCreateCategory() {
    setCreatingCategory({ name: '', saving: false, error: '' });
  }

  function openCreateSubcategory() {
    setCreatingSubcategory({ name: '', saving: false, error: '' });
  }

  function updateCreatingCategoryName(value: string) {
    setCreatingCategory((prev) => (prev ? { ...prev, name: value, error: '' } : prev));
  }

  function updateCreatingSubcategoryName(value: string) {
    setCreatingSubcategory((prev) => (prev ? { ...prev, name: value, error: '' } : prev));
  }

  async function submitCreateCategory() {
    const name = creatingCategory?.name.trim();
    if (!name) return;
    setCreatingCategory((prev) => prev && { ...prev, saving: true, error: '' });
    try {
      const created = await createCategory(name);
      setCategories((prev) => [...prev, created]);
      updateCategory(String(created.idCategory));
      setCreatingCategory(null);
    } catch (err) {
      setCreatingCategory((prev) => prev && {
        ...prev,
        saving: false,
        error: err instanceof Error ? err.message : 'Erro ao criar categoria',
      });
    }
  }

  async function submitCreateSubcategory() {
    const name = creatingSubcategory?.name.trim();
    if (!name || !modal?.form.idCategory) return;
    setCreatingSubcategory((prev) => prev && { ...prev, saving: true, error: '' });
    try {
      const created = await createSubcategory(name, Number(modal.form.idCategory));
      setSubcategories((prev) => [...prev, created]);
      updateSubcategory(String(created.idSubcategory));
      setCreatingSubcategory(null);
    } catch (err) {
      setCreatingSubcategory((prev) => prev && {
        ...prev,
        saving: false,
        error: err instanceof Error ? err.message : 'Erro ao criar subcategoria',
      });
    }
  }

  function handleCreateCategoryKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      submitCreateCategory();
    } else if (e.key === 'Escape') {
      setCreatingCategory(null);
    }
  }

  function handleCreateSubcategoryKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      submitCreateSubcategory();
    } else if (e.key === 'Escape') {
      setCreatingSubcategory(null);
    }
  }

  function updateReceiptSpreadsheet(value: string) {
    setReceiptModal((prev) => (prev ? { ...prev, idSpreadsheet: value } : prev));
  }

  function updateReceiptFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setReceiptModal((prev) => (prev ? { ...prev, file, error: '', success: '' } : prev));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!modal) return;
    const { idSpreadsheet, description, amount, date, idCategory, idSubcategory } = modal.form;

    if (!idSpreadsheet) {
      setModal((prev) => prev && { ...prev, error: 'Selecione a planilha' });
      return;
    }
    if (!idCategory) {
      setModal((prev) => prev && { ...prev, error: 'Selecione a categoria' });
      return;
    }
    if (!idSubcategory) {
      setModal((prev) => prev && { ...prev, error: 'Selecione a subcategoria' });
      return;
    }
    if (!date) {
      setModal((prev) => prev && { ...prev, error: 'Selecione a data' });
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
        const created = await createExpense(Number(idSpreadsheet), payload);
        onExpenseCreated?.(created);
      } else if (modal.expense) {
        const updated = await updateExpense(Number(idSpreadsheet), modal.expense.idExpense, payload);
        onExpenseUpdated?.(updated);
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

  async function handleReceiptSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!receiptModal?.file) return;
    if (!receiptModal.idSpreadsheet) {
      setReceiptModal((prev) => prev && { ...prev, error: 'Selecione a planilha' });
      return;
    }
    setReceiptModal((prev) => prev && { ...prev, saving: true, error: '', success: '' });
    try {
      const targetId = Number(receiptModal.idSpreadsheet);
      const created = await createExpenseFromReceipt(targetId, receiptModal.file);
      onExpenseCreated?.(created);
      if (created.idSpreadsheet === targetId) {
        setReceiptModal(null);
      } else {
        setReceiptModal((prev) => prev && {
          ...prev,
          saving: false,
          file: null,
          success: 'Comprovante processado, mas o lançamento foi adicionado a outra planilha.',
        });
      }
    } catch (err) {
      setReceiptModal((prev) => prev && {
        ...prev,
        saving: false,
        error: err instanceof Error ? err.message : 'Erro ao processar o comprovante',
      });
    }
  }

  return (
    <>
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center sm:p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setModal(null)} />
          <div className="relative bg-canvas shadow-xl w-full h-full sm:h-auto sm:rounded-2xl sm:max-w-xl p-5 sm:p-6 sm:max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-ink">
                {modal.mode === 'create' ? 'Novo gasto' : 'Editar gasto'}
              </h2>
              <button onClick={() => setModal(null)} className="text-ink-subtle hover:text-ink transition-colors" aria-label="Fechar">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {modal.error && (
              <div className={errorBannerClass}>
                {modal.error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {!lockedSpreadsheetId && (
                <div>
                  <label className={labelClass}>
                    Planilha <span className="text-error">*</span>
                  </label>
                  <SearchableSelect
                    value={modal.form.idSpreadsheet}
                    onChange={updateSpreadsheet}
                    options={spreadsheetOptions}
                    placeholder="Selecione a planilha"
                    searchPlaceholder="Buscar planilha..."
                    className={inputClass}
                  />
                </div>
              )}

              <div>
                <label className={labelClass}>
                  Descrição <span className="text-error">*</span>
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>
                    Valor (R$) <span className="text-error">*</span>
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
                  <label className={labelClass}>
                    Data <span className="text-error">*</span>
                  </label>
                  <DatePicker
                    value={modal.form.date}
                    onChange={updateDate}
                    className={inputClass}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className={labelClass}>
                    Categoria <span className="text-error">*</span>
                  </label>
                  {!creatingCategory && (
                    <button
                      type="button"
                      onClick={openCreateCategory}
                      className={linkButtonClass}
                    >
                      + Nova categoria
                    </button>
                  )}
                </div>
                <SearchableSelect
                  value={modal.form.idCategory}
                  onChange={updateCategory}
                  options={categories.map((c) => ({ value: String(c.idCategory), label: c.name }))}
                  placeholder="Selecione a categoria"
                  searchPlaceholder="Buscar categoria..."
                  className={inputClass}
                />
                {creatingCategory && (
                  <div className="mt-2 flex items-start gap-2">
                    <div className="flex-1">
                      <input
                        autoFocus
                        type="text"
                        value={creatingCategory.name}
                        onChange={(e) => updateCreatingCategoryName(e.target.value)}
                        onKeyDown={handleCreateCategoryKeyDown}
                        placeholder="Nome da nova categoria"
                        className={inputClass}
                      />
                      {creatingCategory.error && (
                        <p className="mt-1 text-xs text-error">{creatingCategory.error}</p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={submitCreateCategory}
                      disabled={creatingCategory.saving || !creatingCategory.name.trim()}
                      className={inlineAddButtonClass}
                    >
                      {creatingCategory.saving ? '...' : 'Adicionar'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setCreatingCategory(null)}
                      className={inlineCancelButtonClass}
                    >
                      Cancelar
                    </button>
                  </div>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className={labelClass}>
                    Subcategoria <span className="text-error">*</span>
                  </label>
                  {!creatingSubcategory && modal.form.idCategory && (
                    <button
                      type="button"
                      onClick={openCreateSubcategory}
                      className={linkButtonClass}
                    >
                      + Nova subcategoria
                    </button>
                  )}
                </div>
                <SearchableSelect
                  value={modal.form.idSubcategory}
                  onChange={updateSubcategory}
                  options={filteredSubs.map((s) => ({ value: String(s.idSubcategory), label: s.name }))}
                  placeholder={modal.form.idCategory ? 'Selecione a subcategoria' : 'Selecione uma categoria primeiro'}
                  searchPlaceholder="Buscar subcategoria..."
                  disabled={!modal.form.idCategory}
                  className={`${inputClass} disabled:bg-surface-2 disabled:text-ink-subtle disabled:cursor-not-allowed`}
                />
                {creatingSubcategory && (
                  <div className="mt-2 flex items-start gap-2">
                    <div className="flex-1">
                      <input
                        autoFocus
                        type="text"
                        value={creatingSubcategory.name}
                        onChange={(e) => updateCreatingSubcategoryName(e.target.value)}
                        onKeyDown={handleCreateSubcategoryKeyDown}
                        placeholder="Nome da nova subcategoria"
                        className={inputClass}
                      />
                      {creatingSubcategory.error && (
                        <p className="mt-1 text-xs text-error">{creatingSubcategory.error}</p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={submitCreateSubcategory}
                      disabled={creatingSubcategory.saving || !creatingSubcategory.name.trim()}
                      className={inlineAddButtonClass}
                    >
                      {creatingSubcategory.saving ? '...' : 'Adicionar'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setCreatingSubcategory(null)}
                      className={inlineCancelButtonClass}
                    >
                      Cancelar
                    </button>
                  </div>
                )}
              </div>

              <div className="flex flex-col-reverse sm:flex-row gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModal(null)}
                  className={modalCancelButtonClass}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={modal.saving}
                  className={modalSubmitButtonClass}
                >
                  {modal.saving
                    ? 'Salvando...'
                    : modal.mode === 'create' ? 'Adicionar gasto' : 'Salvar alterações'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {receiptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setReceiptModal(null)} />
          <div className="relative bg-canvas shadow-xl rounded-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-ink">Importar comprovante</h2>
              <button onClick={() => setReceiptModal(null)} className="text-ink-subtle hover:text-ink transition-colors" aria-label="Fechar">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {receiptModal.error && (
              <div className={errorBannerClass}>
                {receiptModal.error}
              </div>
            )}

            {receiptModal.success && (
              <div className={successBannerClass}>
                {receiptModal.success}
              </div>
            )}

            <form onSubmit={handleReceiptSubmit} className="space-y-4">
              {!lockedSpreadsheetId && (
                <div>
                  <label className={labelClass}>
                    Planilha <span className="text-error">*</span>
                  </label>
                  <SearchableSelect
                    value={receiptModal.idSpreadsheet}
                    onChange={updateReceiptSpreadsheet}
                    options={spreadsheetOptions}
                    placeholder="Selecione a planilha"
                    searchPlaceholder="Buscar planilha..."
                    className={inputClass}
                  />
                </div>
              )}

              <div>
                <label className={labelClass}>
                  Comprovante (PDF, JPEG ou PNG) <span className="text-error">*</span>
                </label>
                <input
                  type="file"
                  accept="application/pdf,image/jpeg,image/png"
                  onChange={updateReceiptFile}
                  required
                  className={`${inputClass} file:mr-3 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20`}
                />
                <p className="mt-1.5 text-xs text-ink-subtle">
                  O gasto será lançado automaticamente a partir dos dados do comprovante.
                </p>
              </div>

              <div className="flex flex-col-reverse sm:flex-row gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setReceiptModal(null)}
                  className={modalCancelButtonClass}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={receiptModal.saving || !receiptModal.file}
                  className={modalSubmitButtonClass}
                >
                  {receiptModal.saving ? 'Processando...' : 'Importar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
});

export default ExpenseModals;
