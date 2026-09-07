import { getAccessToken } from "./auth";
import type { SharingPermission } from "./sharings";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export interface UserDefaultPermission {
  idDefaultPermission: number;
  idTargetUser: number;
  permission: SharingPermission;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDefaultPermissionPayload {
  idTargetUser: number;
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

export async function addDefaultPermission(
  data: CreateDefaultPermissionPayload,
): Promise<UserDefaultPermission> {
  return authFetch<UserDefaultPermission>("/users/me/default-permissions", {
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
