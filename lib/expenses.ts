import { getAccessToken } from "./auth";

const API_URL = "http://localhost:3001";

export interface Category {
  idCategory: number;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface Subcategory {
  idSubcategory: number;
  idCategory: number;
  name: string;
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
    throw new Error(message);
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

export async function getCategories(): Promise<Category[]> {
  return authFetch<Category[]>("/categories");
}

export async function getSubcategories(): Promise<Subcategory[]> {
  return authFetch<Subcategory[]>("/subcategories");
}
