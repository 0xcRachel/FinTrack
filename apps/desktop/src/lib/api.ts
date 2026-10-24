/**
 * Centralized API layer with JWT authentication support.
 * All requests route through the Spring Boot backend on http://127.0.0.1:8080/api/v1.
 */

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8080/api/v1';

export class ApiRequestError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiRequestError';
    this.status = status;
  }

  get isNetworkError(): boolean {
    return this.status === 0;
  }
}

export function getToken(): string | null {
  return localStorage.getItem('fintrack_token');
}

export function setToken(token: string): void {
  localStorage.setItem('fintrack_token', token);
}

export function clearToken(): void {
  localStorage.removeItem('fintrack_token');
}

/** Fired once when the backend rejects a request because the JWT expired. */
export const AUTH_EXPIRED_EVENT = 'fintrack:auth-expired';

function handleUnauthorized(res: Response): void {
  if (res.status !== 401 || !getToken()) return;
  clearToken();
  window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
}

function getAuthHeaders(): Record<string, string> {
  const token = getToken();
  return {
    Accept: 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function parseError(res: Response): Promise<ApiRequestError> {
  let message = `Request failed (HTTP ${res.status})`;
  try {
    const body = (await res.json()) as { message?: string; error?: string };
    if (body?.message && typeof body.message === 'string' && body.message.length > 0) {
      message = body.message;
    } else if (body?.error && typeof body.error === 'string') {
      message = body.error;
    }
  } catch {
    // Non-JSON error body
  }
  return new ApiRequestError(message, res.status);
}

export async function ensureAuthenticated(): Promise<string> {
  return getToken() ?? '';
}

export async function apiGet<T>(path: string, signal?: AbortSignal): Promise<T> {
  await ensureAuthenticated();
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      signal,
      headers: getAuthHeaders(),
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') throw err;
    throw new ApiRequestError('Cannot reach the backend. Is it running?', 0);
  }
  if (!res.ok) {
    handleUnauthorized(res);
    throw await parseError(res);
  }
  return (await res.json()) as T;
}

export async function apiPost<T, B = unknown>(path: string, body: B, signal?: AbortSignal): Promise<T> {
  await ensureAuthenticated();
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      method: 'POST',
      signal,
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
      body: JSON.stringify(body),
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') throw err;
    throw new ApiRequestError('Cannot reach the backend. Is it running?', 0);
  }
  if (!res.ok) {
    handleUnauthorized(res);
    throw await parseError(res);
  }
  return (await res.json()) as T;
}

export async function apiPut<T, B = unknown>(path: string, body: B, signal?: AbortSignal): Promise<T> {
  await ensureAuthenticated();
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      method: 'PUT',
      signal,
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
      body: JSON.stringify(body),
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') throw err;
    throw new ApiRequestError('Cannot reach the backend. Is it running?', 0);
  }
  if (!res.ok) {
    handleUnauthorized(res);
    throw await parseError(res);
  }
  return (await res.json()) as T;
}

export async function apiPatch<T, B = unknown>(path: string, body?: B, signal?: AbortSignal): Promise<T> {
  await ensureAuthenticated();
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      method: 'PATCH',
      signal,
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') throw err;
    throw new ApiRequestError('Cannot reach the backend. Is it running?', 0);
  }
  if (!res.ok) {
    handleUnauthorized(res);
    throw await parseError(res);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export async function apiDelete<T>(path: string, signal?: AbortSignal): Promise<T> {  await ensureAuthenticated();
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      method: 'DELETE',
      signal,
      headers: getAuthHeaders(),
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') throw err;
    throw new ApiRequestError('Cannot reach the backend. Is it running?', 0);
  }
  if (!res.ok) {
    handleUnauthorized(res);
    throw await parseError(res);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export { API_BASE_URL };
