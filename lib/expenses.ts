import { getAccessToken } from "./auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export interface Category {
  idCategory: number;
  name: string;
  idUser: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface Subcategory {
  idSubcategory: number;
  idCategory: number;
  name: string;
  idUser: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface Expense {
  idExpense: number;
  description: string;
  amount: number;
  date: string;
  idSpreadsheet: number;
  idCategory: number;
  category: Category;
  idSubcategory: number;
  subcategory: Subcategory;
  idCreatedBy: number;
  idUpdatedBy: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateExpensePayload {
  description: string;
  amount: number;
  date: string;
  idCategory: number;
  idSubcategory: number;
}

export interface UpdateExpensePayload {
  description?: string;
  amount?: number;
  date?: string;
  idCategory?: number;
  idSubcategory?: number;
}

export interface ApiError extends Error {
  status?: number;
}

async function authFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getAccessToken();
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...init?.headers,
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const message = Array.isArray(body.message)
      ? body.message[0]
      : body.message || "Erro inesperado";
    const error: ApiError = new Error(message);
    error.status = res.status;
    throw error;
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export async function getExpenses(idSpreadsheet: number): Promise<Expense[]> {
  return authFetch<Expense[]>(`/spreadsheets/${idSpreadsheet}/expenses`);
}

export async function createExpense(
  idSpreadsheet: number,
  data: CreateExpensePayload,
): Promise<Expense> {
  return authFetch<Expense>(`/spreadsheets/${idSpreadsheet}/expenses`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateExpense(
  idSpreadsheet: number,
  id: number,
  data: UpdateExpensePayload,
): Promise<Expense> {
  return authFetch<Expense>(`/spreadsheets/${idSpreadsheet}/expenses/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function deleteExpense(
  idSpreadsheet: number,
  id: number,
): Promise<void> {
  return authFetch<void>(`/spreadsheets/${idSpreadsheet}/expenses/${id}`, {
    method: "DELETE",
  });
}

export async function createExpenseFromReceipt(
  idSpreadsheet: number,
  file: File,
): Promise<Expense> {
  const token = getAccessToken();
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(
    `${API_URL}/spreadsheets/${idSpreadsheet}/expenses/from-receipt`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    },
  );
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const message = Array.isArray(body.message)
      ? body.message[0]
      : body.message || "Erro inesperado";
    throw new Error(message);
  }
  return res.json();
}

export async function getCategories(): Promise<Category[]> {
  return authFetch<Category[]>("/categories");
}

export async function getSubcategories(): Promise<Subcategory[]> {
  return authFetch<Subcategory[]>("/subcategories");
}

export async function createCategory(name: string): Promise<Category> {
  return authFetch<Category>("/categories", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
}

export async function createSubcategory(
  name: string,
  idCategory: number,
): Promise<Subcategory> {
  return authFetch<Subcategory>("/subcategories", {
    method: "POST",
    body: JSON.stringify({ name, idCategory }),
  });
}

export interface UpdateCategoryPayload {
  name?: string;
}

export interface UpdateSubcategoryPayload {
  name?: string;
  idCategory?: number;
}

export async function updateCategory(
  id: number,
  data: UpdateCategoryPayload,
): Promise<Category> {
  return authFetch<Category>(`/categories/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function deleteCategory(id: number): Promise<void> {
  return authFetch<void>(`/categories/${id}`, { method: "DELETE" });
}

export async function updateSubcategory(
  id: number,
  data: UpdateSubcategoryPayload,
): Promise<Subcategory> {
  return authFetch<Subcategory>(`/subcategories/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function deleteSubcategory(id: number): Promise<void> {
  return authFetch<void>(`/subcategories/${id}`, { method: "DELETE" });
}
