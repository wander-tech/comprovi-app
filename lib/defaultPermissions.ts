import { getAccessToken } from "./auth";
import type { SharingPermission } from "./sharings";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export type DefaultPermissionInvitationStatus = "pending" | "accepted" | "declined";

export interface UserDefaultPermission {
  idDefaultPermission: number;
  idTargetUser: number;
  targetName: string;
  targetEmail: string;
  permission: SharingPermission;
  createdAt: string;
  updatedAt: string;
}

export interface DefaultPermissionInvitation {
  idInvitation: number;
  idInviter: number;
  inviterName?: string;
  inviterEmail?: string;
  idInvitedUser: number;
  invitedUserName?: string;
  invitedUserEmail?: string;
  permission: SharingPermission;
  status: DefaultPermissionInvitationStatus;
  createdAt: string;
  respondedAt: string | null;
}

export interface CreateDefaultPermissionPayload {
  email: string;
  permission: SharingPermission;
}

export interface UpdateDefaultPermissionPayload {
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

export async function getDefaultPermissions(): Promise<UserDefaultPermission[]> {
  return authFetch<UserDefaultPermission[]>("/users/me/default-permissions");
}

export async function inviteDefaultPermission(
  data: CreateDefaultPermissionPayload,
): Promise<DefaultPermissionInvitation> {
  return authFetch<DefaultPermissionInvitation>("/users/me/default-permissions", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateDefaultPermission(
  idTargetUser: number,
  data: UpdateDefaultPermissionPayload,
): Promise<UserDefaultPermission> {
  return authFetch<UserDefaultPermission>(
    `/users/me/default-permissions/${idTargetUser}`,
    {
      method: "PATCH",
      body: JSON.stringify(data),
    },
  );
}

export async function removeDefaultPermission(
  idTargetUser: number,
): Promise<void> {
  return authFetch<void>(`/users/me/default-permissions/${idTargetUser}`, {
    method: "DELETE",
  });
}

export async function getSentDefaultPermissionInvitations(): Promise<DefaultPermissionInvitation[]> {
  return authFetch<DefaultPermissionInvitation[]>(
    "/users/me/default-permissions/invitations",
  );
}

export async function cancelDefaultPermissionInvitation(
  idInvitation: number,
): Promise<void> {
  return authFetch<void>(
    `/users/me/default-permissions/invitations/${idInvitation}`,
    { method: "DELETE" },
  );
}

export async function getReceivedDefaultPermissionInvitations(): Promise<DefaultPermissionInvitation[]> {
  return authFetch<DefaultPermissionInvitation[]>(
    "/default-permission-invitations",
  );
}

export async function acceptDefaultPermissionInvitation(
  id: number,
): Promise<DefaultPermissionInvitation> {
  return authFetch<DefaultPermissionInvitation>(
    `/default-permission-invitations/${id}/accept`,
    { method: "POST" },
  );
}

export async function declineDefaultPermissionInvitation(
  id: number,
): Promise<DefaultPermissionInvitation> {
  return authFetch<DefaultPermissionInvitation>(
    `/default-permission-invitations/${id}/decline`,
    { method: "POST" },
  );
}
