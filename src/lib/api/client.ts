import * as session from '../auth/sessionStore';
import { API_V1 } from './config';

/** A typed API failure. `code` is the server's stable error string when present. */
export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string | null,
    public details: string[] = [],
    message?: string,
  ) {
    super(message ?? code ?? `HTTP ${status}`);
    this.name = 'ApiError';
  }
}

export type Query = Record<string, string | number | boolean | undefined | null>;

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  query?: Query;
  headers?: Record<string, string>;
  /** Sent as Idempotency-Key — used by the chat turn endpoint for safe retries. */
  idempotencyKey?: string;
  /** Skip attaching/refreshing the bearer token (e.g. the login call). */
  noAuth?: boolean;
}

function buildUrl(path: string, query?: Query): string {
  let url = `${API_V1}${path}`;
  if (query) {
    const parts = Object.entries(query)
      .filter(([, v]) => v !== undefined && v !== null)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
    if (parts.length) url += `?${parts.join('&')}`;
  }
  return url;
}

function doFetch(path: string, opts: RequestOptions, token: string | null): Promise<Response> {
  const hasBody = opts.body !== undefined;
  return fetch(buildUrl(path, opts.query), {
    method: opts.method ?? 'GET',
    headers: {
      Accept: 'application/json',
      ...(hasBody ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts.idempotencyKey ? { 'Idempotency-Key': opts.idempotencyKey } : {}),
      ...opts.headers,
    },
    body: hasBody ? JSON.stringify(opts.body) : undefined,
  });
}

async function parse<T>(res: Response): Promise<T> {
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  const data = text ? safeJson(text) : null;
  if (!res.ok) {
    throw new ApiError(res.status, data?.error ?? null, data?.details ?? [], data?.error ?? undefined);
  }
  return data as T;
}

function safeJson(text: string): any {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/**
 * The core request. Proactively refreshes a near-expired access token, attaches
 * the bearer, and on a 401 transparently rotates the token once and retries — so
 * callers never see an expiry, only a real failure.
 */
export async function apiRequest<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  if (opts.noAuth) {
    return parse<T>(await doFetch(path, opts, null));
  }

  if (!session.hasValidAccess()) {
    await session.refresh();
  }
  let res = await doFetch(path, opts, session.getAccessToken());

  if (res.status === 401) {
    const refreshed = await session.refresh();
    if (refreshed) {
      res = await doFetch(path, opts, session.getAccessToken());
    }
  }
  return parse<T>(res);
}

export const api = {
  get: <T>(path: string, query?: Query) => apiRequest<T>(path, { method: 'GET', query }),
  post: <T>(path: string, body?: unknown, opts: Partial<RequestOptions> = {}) =>
    apiRequest<T>(path, { method: 'POST', body, ...opts }),
  patch: <T>(path: string, body?: unknown, opts: Partial<RequestOptions> = {}) =>
    apiRequest<T>(path, { method: 'PATCH', body, ...opts }),
  delete: <T>(path: string, opts: Partial<RequestOptions> = {}) =>
    apiRequest<T>(path, { method: 'DELETE', ...opts }),
};
