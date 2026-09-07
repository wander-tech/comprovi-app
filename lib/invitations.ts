import { getAccessToken } from "./auth";
import type { SharingPermission } from "./sharings";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export type InvitationStatus = "pending" | "accepted" | "declined";

export interface SpreadsheetInvitation {
  idInvitation: number;
  idSpreadsheet: number;
  spreadsheetName?: string;
  idInviter: number;
  inviterName?: string;
  idInvitedUser: number;
  invitedUserEmail?: string;
  permission: SharingPermission;
  status: InvitationStatus;
  createdAt: string;
  respondedAt: string | null;
}

export interface CreateInvitationPayload {
  email: string;
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

export async function getSpreadsheetInvitations(
  idSpreadsheet: number,
): Promise<SpreadsheetInvitation[]> {
  return authFetch<SpreadsheetInvitation[]>(
    `/spreadsheets/${idSpreadsheet}/invitations`,
  );
}

export async function inviteToSpreadsheet(
  idSpreadsheet: number,
  data: CreateInvitationPayload,
): Promise<SpreadsheetInvitation> {
  return authFetch<SpreadsheetInvitation>(
    `/spreadsheets/${idSpreadsheet}/invitations`,
    {
      method: "POST",
      body: JSON.stringify(data),
    },
  );
}

export async function cancelInvitation(
  idSpreadsheet: number,
  idInvitation: number,
): Promise<void> {
  return authFetch<void>(
    `/spreadsheets/${idSpreadsheet}/invitations/${idInvitation}`,
    { method: "DELETE" },
  );
}

export async function getMyInvitations(): Promise<SpreadsheetInvitation[]> {
  return authFetch<SpreadsheetInvitation[]>("/spreadsheet-invitations");
}

export async function acceptInvitation(
  id: number,
): Promise<SpreadsheetInvitation> {
  return authFetch<SpreadsheetInvitation>(
    `/spreadsheet-invitations/${id}/accept`,
    { method: "POST" },
  );
}

export async function declineInvitation(
  id: number,
): Promise<SpreadsheetInvitation> {
  return authFetch<SpreadsheetInvitation>(
    `/spreadsheet-invitations/${id}/decline`,
    { method: "POST" },
  );
}
