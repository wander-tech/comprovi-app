const API_URL = "http://localhost:3001";

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
}

export interface AccessTokenResponse {
  accessToken: string;
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const message = Array.isArray(body.message)
      ? body.message[0]
      : body.message || "Ocorreu um erro inesperado";
    throw new Error(message);
  }
  return res.json();
}

export async function login(
  email: string,
  password: string,
): Promise<AuthResponse> {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  return handleResponse<AuthResponse>(res);
}

export async function register(
  name: string,
  email: string,
  password: string,
  phone?: string,
  cpf?: string,
): Promise<AuthResponse> {
  const res = await fetch(`${API_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name,
      email,
      password,
      ...(phone && { phone }),
      ...(cpf && { cpf }),
    }),
  });
  return handleResponse<AuthResponse>(res);
}

export async function forgotPassword(email: string): Promise<void> {
  const res = await fetch(`${API_URL}/auth/forgot-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || "Erro ao solicitar redefinição de senha");
  }
}

export async function resetPassword(
  token: string,
  newPassword: string,
): Promise<void> {
  const res = await fetch(`${API_URL}/auth/reset-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, newPassword }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || "Erro ao redefinir senha");
  }
}

export async function refreshAccessToken(
  token: string,
): Promise<AccessTokenResponse> {
  const res = await fetch(`${API_URL}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken: token }),
  });
  return handleResponse<AccessTokenResponse>(res);
}

function setCookie(name: string, value: string, days: number): void {
  if (typeof document === "undefined") return;
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
}

function getCookieValue(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(
    new RegExp("(?:^|; )" + name + "=([^;]*)"),
  );
  return match ? decodeURIComponent(match[1]) : null;
}

function deleteCookie(name: string): void {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
}

export function saveTokens(accessToken: string, refreshToken: string): void {
  setCookie("accessToken", accessToken, 1);
  setCookie("refreshToken", refreshToken, 7);
}

export function getAccessToken(): string | null {
  return getCookieValue("accessToken");
}

export function getRefreshToken(): string | null {
  return getCookieValue("refreshToken");
}

export function clearTokens(): void {
  deleteCookie("accessToken");
  deleteCookie("refreshToken");
}

export function getUserIdFromToken(): string | null {
  const token = getAccessToken();
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.sub ? String(payload.sub) : null;
  } catch {
    return null;
  }
}
