const API_BASE = import.meta.env.VITE_API_BASE ?? '/api';

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

function getToken(): string | null {
  return localStorage.getItem('cms_token');
}

export function setToken(token: string | null) {
  if (token) localStorage.setItem('cms_token', token);
  else localStorage.removeItem('cms_token');
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers = new Headers(options.headers);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (!(options.body instanceof FormData) && options.body) {
    headers.set('Content-Type', 'application/json');
  }

  const resp = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const contentType = resp.headers.get('content-type') ?? '';
  const data = contentType.includes('json') ? await resp.json() : await resp.text();

  if (!resp.ok) {
    const msg = (data as any)?.error ?? `Lỗi ${resp.status}`;
    if (resp.status === 401) setToken(null);
    throw new ApiError(msg, resp.status);
  }
  return data as T;
}

export const api = {
  get: <T,>(path: string) => request<T>(path),
  post: <T,>(path: string, body?: any) =>
    request<T>(path, { method: 'POST', body: body instanceof FormData ? body : JSON.stringify(body) }),
  put: <T,>(path: string, body?: any) =>
    request<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
  patch: <T,>(path: string, body?: any) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T,>(path: string) => request<T>(path, { method: 'DELETE' }),
};
