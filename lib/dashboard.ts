import { getAccessToken } from './auth';

const API_URL = 'http://localhost:3001';

export interface DashboardCategory {
  idCategory: number;
  name: string;
}

export interface DashboardSubcategory {
  idSubcategory: number;
  name: string;
}

export interface DashboardExpense {
  idExpense: number;
  date: string;
  amount: number;
  description: string;
  idCategory: number;
  category: DashboardCategory;
  idSubcategory: number;
  subcategory: DashboardSubcategory;
}

export interface DashboardSpreadsheet {
  idSpreadsheet: number;
  name: string;
  totalExpenses: number;
  expenses: DashboardExpense[];
}

export interface DashboardResponse {
  startDate: string;
  endDate: string;
  spreadsheets: DashboardSpreadsheet[];
}

export async function getDashboard(
  startDate?: string,
  endDate?: string,
): Promise<DashboardResponse> {
  const token = getAccessToken();
  const params = new URLSearchParams();
  if (startDate) params.set('startDate', startDate);
  if (endDate) params.set('endDate', endDate);
  const query = params.toString() ? `?${params.toString()}` : '';
  const res = await fetch(`${API_URL}/dashboard${query}`, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const message = Array.isArray(body.message)
      ? body.message[0]
      : body.message || 'Erro ao carregar dashboard';
    throw new Error(message);
  }
  return res.json();
}
