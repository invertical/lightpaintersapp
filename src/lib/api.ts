import { API_URL } from '@/constants/api';

/** Error body shape used by every v2 endpoint (application/problem+json). */
export type ProblemDetails = {
  type: string;
  title: string;
  status: number;
  detail?: string;
  code?: string;
  errors?: Record<string, string[]>;
};

export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly errors?: Record<string, string[]>;
  /** Seconds, from the Retry-After header on a 429. */
  readonly retryAfter?: number;
  /** The whole body, for the extra fields some errors carry (e.g. a sign-in step's `token`). */
  readonly problem: ProblemDetails & Record<string, unknown>;

  constructor(problem: ProblemDetails & Record<string, unknown>, retryAfter?: number) {
    super(problem.detail ?? problem.title);
    this.status = problem.status;
    this.code = problem.code;
    this.errors = problem.errors;
    this.retryAfter = retryAfter;
    this.problem = problem;
  }
}

/** Thrown when the request never got a response (offline, wrong host, server down). */
export class NetworkError extends Error {}

/** A Laravel paginator, as every v2 list answers. */
export type Page<T> = {
  data: T[];
  meta: { current_page: number; last_page: number; total: number; per_page: number } & Record<string, unknown>;
};

export type Query = Record<string, string | number | boolean | null | undefined | (string | number)[]>;

/** `?a=1&tag[]=2&tag[]=3`, skipping empty values. */
export function withQuery(path: string, query?: Query) {
  if (!query) return path;
  const parts: string[] = [];
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === '') continue;
    if (Array.isArray(value)) {
      for (const v of value) parts.push(`${encodeURIComponent(key)}[]=${encodeURIComponent(String(v))}`);
    } else {
      parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
    }
  }
  if (parts.length === 0) return path;
  return `${path}${path.includes('?') ? '&' : '?'}${parts.join('&')}`;
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  token?: string | null;
};

export async function apiFetch<T>(path: string, { method = 'GET', body, token }: RequestOptions = {}) {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;

  return send<T>(path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
}

/**
 * POST a multipart form (file uploads). No Content-Type of our own: fetch sets
 * multipart/form-data with its boundary.
 */
export async function apiUpload<T>(path: string, form: FormData, { token }: { token?: string | null } = {}) {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  return send<T>(path, { method: 'POST', headers, body: form });
}

async function send<T>(path: string, init: { method: string; headers: Record<string, string>; body?: BodyInit }) {
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, init);
  } catch (error) {
    throw new NetworkError(error instanceof Error ? error.message : 'Network request failed');
  }

  if (!response.ok) {
    const retryAfter = Number(response.headers.get('Retry-After')) || undefined;
    let problem: ProblemDetails & Record<string, unknown>;
    try {
      problem = await response.json();
    } catch {
      problem = { type: 'about:blank', title: response.statusText, status: response.status };
    }
    throw new ApiError({ ...problem, status: response.status }, retryAfter);
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

/** One line for people, from anything a call can throw. */
export function errorMessage(error: unknown) {
  if (error instanceof NetworkError) {
    return "Can't reach LightPainters. Check your connection and try again.";
  }
  if (error instanceof ApiError) {
    if (error.status === 422) {
      const first = error.errors && Object.values(error.errors)[0]?.[0];
      return first ?? error.message;
    }
    if (error.status === 429) {
      const seconds = error.retryAfter;
      return seconds
        ? `Too many attempts. Try again in ${Math.ceil(seconds / 60)} min.`
        : 'Too many attempts. Try again in a few minutes.';
    }
    if (error.status === 403) return error.message || "You can't do that.";
    if (error.status === 404) return "That isn't here any more.";
  }
  return 'Something went wrong. Try again.';
}

/** The first message for one field of a 422, for showing under that field. */
export function fieldError(error: unknown, field: string) {
  return error instanceof ApiError ? error.errors?.[field]?.[0] : undefined;
}
