import { getAccessToken } from "./auth";

const API_URL = "http://localhost:3001";

export interface SpreadsheetStatus {
  idSpreadsheetStatus: number;
  name: string;
  cdChave: string;
}

export interface Spreadsheet {
  idSpreadsheet: number;
  name: string;
  idSpreadsheetStatus: number | null;
  status: SpreadsheetStatus | null;
  observation: string | null;
  idOwner: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSpreadsheetPayload {
  name: string;
  idSpreadsheetStatus?: number;
  observation?: string;
}

export interface UpdateSpreadsheetPayload {
  name?: string;
  idSpreadsheetStatus?: number;
  observation?: string;
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

export async function getSpreadsheets(): Promise<Spreadsheet[]> {
  return authFetch<Spreadsheet[]>("/spreadsheets");
}

export async function getSpreadsheet(id: number): Promise<Spreadsheet> {
  return authFetch<Spreadsheet>(`/spreadsheets/${id}`);
}

export async function createSpreadsheet(
  data: CreateSpreadsheetPayload,
): Promise<Spreadsheet> {
  return authFetch<Spreadsheet>("/spreadsheets", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateSpreadsheet(
  id: number,
  data: UpdateSpreadsheetPayload,
): Promise<Spreadsheet> {
  return authFetch<Spreadsheet>(`/spreadsheets/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function deleteSpreadsheet(id: number): Promise<void> {
  return authFetch<void>(`/spreadsheets/${id}`, { method: "DELETE" });
}

export async function getSpreadsheetStatuses(): Promise<SpreadsheetStatus[]> {
  return authFetch<SpreadsheetStatus[]>("/spreadsheet-statuses");
}
