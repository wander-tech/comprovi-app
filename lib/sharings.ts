import { getAccessToken } from "./auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export type SharingPermission = "read" | "edit";

export interface Sharing {
  idSharing: number;
  idSpreadsheet: number;
  idUser: number;
  permission: SharingPermission;
  createdAt: string;
}

export interface UpdateSharingPayload {
  permission: SharingPermission;
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

export async function getSharings(idSpreadsheet: number): Promise<Sharing[]> {
  return authFetch<Sharing[]>(`/spreadsheets/${idSpreadsheet}/sharings`);
}

export async function updateSharing(
  idSpreadsheet: number,
  idUser: number,
  data: UpdateSharingPayload,
): Promise<Sharing> {
  return authFetch<Sharing>(
    `/spreadsheets/${idSpreadsheet}/sharings/${idUser}`,
    {
      method: "PATCH",
      body: JSON.stringify(data),
    },
  );
}

export async function removeSharing(
  idSpreadsheet: number,
  idUser: number,
): Promise<void> {
  return authFetch<void>(`/spreadsheets/${idSpreadsheet}/sharings/${idUser}`, {
    method: "DELETE",
  });
}
