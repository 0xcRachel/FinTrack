/**
 * Centralized API layer. The base URL comes from environment config
 * (VITE_API_BASE_URL) — never hardcoded across features.
 * All database access goes through the Spring Boot backend.
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

async function parseError(res: Response): Promise<ApiRequestError> {
  let message = `Request failed (HTTP ${res.status})`;
  try {
    const body = (await res.json()) as { message?: string };
    if (body && typeof body.message === 'string' && body.message.length > 0) {
      message = body.message;
    }
  } catch {
    // Non-JSON error body (proxies, backend down) — keep generic message.
  }
  return new ApiRequestError(message, res.status);
}

export async function apiGet<T>(path: string, signal?: AbortSignal): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      signal,
      headers: { Accept: 'application/json' },
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') throw err;
    throw new ApiRequestError('Cannot reach the backend. Is it running?', 0);
  }
  if (!res.ok) throw await parseError(res);
  return (await res.json()) as T;
}

export { API_BASE_URL };
