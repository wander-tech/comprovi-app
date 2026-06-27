import { getAccessToken } from './auth';

const API_URL = 'http://localhost:3000';

export interface User {
  idUser: number;
  name: string;
  email: string;
  admin: boolean;
  phone: string | null;
  cpf: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateUserPayload {
  name?: string;
  email?: string;
  phone?: string;
  cpf?: string;
  password?: string;
}

export interface CreateUserPayload {
  name: string;
  email: string;
  password: string;
  phone?: string;
  cpf?: string;
}

export interface UserFilters {
  name?: string;
  email?: string;
  cpf?: string;
  phone?: string;
}

async function authFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getAccessToken();
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...init?.headers,
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const message = Array.isArray(body.message) ? body.message[0] : body.message || 'Erro inesperado';
    throw new Error(message);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export async function getUsers(filters?: UserFilters): Promise<User[]> {
  const params = new URLSearchParams();
  if (filters?.name) params.set('name', filters.name);
  if (filters?.email) params.set('email', filters.email);
  if (filters?.cpf) params.set('cpf', filters.cpf);
  if (filters?.phone) params.set('phone', filters.phone);
  const qs = params.toString();
  return authFetch<User[]>(`/users${qs ? `?${qs}` : ''}`);
}

export async function getMe(): Promise<User> {
  return authFetch<User>('/users/me');
}

export async function createUser(data: CreateUserPayload): Promise<User> {
  return authFetch<User>('/users', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getUser(id: string): Promise<User> {
  return authFetch<User>(`/users/${id}`);
}

export async function updateUser(id: string, data: UpdateUserPayload): Promise<User> {
  return authFetch<User>(`/users/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deleteUser(id: string): Promise<void> {
  return authFetch<void>(`/users/${id}`, { method: 'DELETE' });
}
