import { z } from 'zod';
import { joinPayloadSchema } from '../validators/join';
import { teacherLoginSchema } from '../validators/teacher';

const EDGE_FUNCTIONS_PREFIX = '/functions/v1';
const rawApiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? '').trim();
const rawSupabaseUrl = (import.meta.env.VITE_SUPABASE_URL ?? '').trim();

const trimTrailingSlash = (value: string): string => value.replace(/\/+$/, '');

const withFunctionsPrefix = (baseUrl: string): string => {
  const normalized = trimTrailingSlash(baseUrl);
  if (!normalized) {
    return normalized;
  }
  return normalized.endsWith(EDGE_FUNCTIONS_PREFIX)
    ? normalized
    : `${normalized}${EDGE_FUNCTIONS_PREFIX}`;
};

const resolveApiBaseUrl = (): string => {
  if (rawApiBaseUrl) {
    return trimTrailingSlash(rawApiBaseUrl);
  }
  if (rawSupabaseUrl) {
    return withFunctionsPrefix(rawSupabaseUrl);
  }
  return '';
};

// Base URL for edge function requests. We first respect VITE_API_BASE_URL,
// then fall back to VITE_SUPABASE_URL + /functions/v1 for local Supabase setups.
const API_BASE_URL = resolveApiBaseUrl();

const missingApiBaseUrlMessage =
  'Frontend API base URL is missing. Set VITE_API_BASE_URL or VITE_SUPABASE_URL in .env.local and restart the dev server.';

const canRetryWithFunctionsPrefix = (() => {
  if (!API_BASE_URL || API_BASE_URL.endsWith(EDGE_FUNCTIONS_PREFIX)) {
    return false;
  }

  try {
    const parsed = new URL(API_BASE_URL);
    return parsed.pathname === '' || parsed.pathname === '/';
  } catch {
    // Relative base URLs are treated as intentional and are not rewritten.
    return false;
  }
})();

type ApiErrorPayload = {
  error?: {
    message?: string;
    code?: string;
  };
};

type JsonValue = Record<string, unknown> | Array<unknown> | string | number | boolean | null;

const buildUrl = (path: string, baseUrl: string = API_BASE_URL) => {
  if (!baseUrl) {
    return path;
  }
  const base = trimTrailingSlash(baseUrl);
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${base}${normalized}`;
};

const mergeHeaders = (base: HeadersInit | undefined, extra: HeadersInit) => {
  const merged = new Headers(base);
  const additional = new Headers(extra);
  additional.forEach((value, key) => {
    merged.set(key, value);
  });
  return merged;
};

const isJsonContentType = (response: Response): boolean => {
  const contentType = response.headers.get('content-type') ?? '';
  return contentType.toLowerCase().includes('application/json');
};

const looksLikeJson = (raw: string): boolean => {
  const trimmed = raw.trim();
  return trimmed.startsWith('{') || trimmed.startsWith('[');
};

const parseJsonBody = async (response: Response): Promise<JsonValue | null> => {
  const raw = await response.text();
  if (!raw) {
    return null;
  }
  if (!isJsonContentType(response) && !looksLikeJson(raw)) {
    return null;
  }
  try {
    return JSON.parse(raw) as JsonValue;
  } catch {
    throw new Error('Invalid JSON response.');
  }
};

const endpointNotFoundMessage = (path: string): string => {
  const prefix = path.startsWith('/join') ? 'Join endpoint' : 'API endpoint';
  return `${prefix} was not found. Check VITE_API_BASE_URL (or VITE_SUPABASE_URL) points to your functions URL (for example http://127.0.0.1:54321/functions/v1).`;
};

const assertApiBaseUrlConfigured = (): void => {
  if (!API_BASE_URL) {
    throw new Error(missingApiBaseUrlMessage);
  }
};

const fetchJsonWithConnectivityGuidance = async (
  url: string,
  requestInit: RequestInit,
): Promise<Response> => {
  try {
    return await fetch(url, requestInit);
  } catch (error) {
    // Browsers report connection-refused/cannot-connect as a TypeError from fetch.
    if (error instanceof TypeError) {
      throw new Error(
        `Could not reach the API server at ${url}. Ensure Supabase is running and the functions endpoint is reachable.`,
      );
    }
    throw error;
  }
};

const handleJsonResponse = async <TResponse>(
  response: Response,
  path: string,
): Promise<TResponse> => {
  const payload = await parseJsonBody(response);
  if (!response.ok) {
    const payloadMessage = (payload as ApiErrorPayload | null)?.error?.message;
    const message =
      payloadMessage ??
      (response.status === 404 ? endpointNotFoundMessage(path) : response.statusText) ??
      'Request failed.';
    throw new Error(message);
  }
  if (payload === null) {
    throw new Error(`Invalid JSON response from ${path}.`);
  }
  return payload as TResponse;
};

const shouldRetryWithFunctionsPrefix = (response: Response): boolean =>
  // Some gateways return JSON for missing routes; retry any 404 once when the
  // configured base URL is a host root that can safely receive /functions/v1.
  canRetryWithFunctionsPrefix && response.status === 404;

export async function getJson<TResponse>(
  path: string,
  options?: Omit<RequestInit, 'method'>,
): Promise<TResponse> {
  assertApiBaseUrlConfigured();

  const requestInit: RequestInit = {
    ...options,
    method: 'GET',
    headers: mergeHeaders(options?.headers, { Accept: 'application/json' }),
  };

  let response = await fetchJsonWithConnectivityGuidance(buildUrl(path), requestInit);
  if (shouldRetryWithFunctionsPrefix(response)) {
    response = await fetchJsonWithConnectivityGuidance(
      buildUrl(path, withFunctionsPrefix(API_BASE_URL)),
      requestInit,
    );
  }

  return await handleJsonResponse<TResponse>(response, path);
}

export async function postJson<TResponse, TBody>(
  path: string,
  body: TBody,
  options?: Omit<RequestInit, 'method' | 'body'>,
): Promise<TResponse> {
  assertApiBaseUrlConfigured();

  const requestInit: RequestInit = {
    ...options,
    method: 'POST',
    body: JSON.stringify(body),
    headers: mergeHeaders(options?.headers, {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    }),
  };

  let response = await fetchJsonWithConnectivityGuidance(buildUrl(path), requestInit);
  if (shouldRetryWithFunctionsPrefix(response)) {
    response = await fetchJsonWithConnectivityGuidance(
      buildUrl(path, withFunctionsPrefix(API_BASE_URL)),
      requestInit,
    );
  }

  return await handleJsonResponse<TResponse>(response, path);
}

export type JoinPayload = z.infer<typeof joinPayloadSchema>;
export type TeacherLoginPayload = z.infer<typeof teacherLoginSchema>;

export type RawProgressRecord = {
  activity_id: string;
  state: Record<string, unknown>;
  updated_at: string;
};

export type JoinResponse = {
  session_token: string;
  student_profile: {
    id: string;
    class_code: string;
    display_name: string;
    created_at?: string | null;
    last_seen_at?: string | null;
  };
  progress: RawProgressRecord[];
};

export type LoadResponse = {
  progress: RawProgressRecord[];
};

export type SaveResponse = {
  updated_at: string;
  progress: Array<{
    activity_id: string;
    updated_at: string;
  }>;
};

export type TeacherReportResponse = {
  class_code: string;
  totals: {
    students: number;
    active_last_24h: number;
  };
  activities: Array<{
    activity_id: string;
    total: number;
    updated_at_buckets: Record<string, number>;
  }>;
  leaderboard: Array<{
    student_id: string;
    display_name: string;
    completed: number;
    last_seen_at: string | null;
  }>;
};

const toJoinPayload = (payload: JoinPayload) => ({
  class_code: payload.classCode,
  student_code: payload.studentCode,
  display_name: payload.displayName,
});

const buildAuthHeaders = (token: string) => ({
  Authorization: `Bearer ${token}`,
});

export const apiClient = {
  async join(payload: JoinPayload): Promise<JoinResponse> {
    return await postJson<JoinResponse, ReturnType<typeof toJoinPayload>>(
      '/join',
      toJoinPayload(payload),
    );
  },
  async loadProgress(token: string, since?: string): Promise<LoadResponse> {
    const query = since ? `?since=${encodeURIComponent(since)}` : '';
    return await getJson<LoadResponse>(`/load${query}`, {
      headers: buildAuthHeaders(token),
    });
  },
  async saveProgress(
    token: string,
    updates: Array<{ activity_id: string; state: Record<string, unknown> }>,
  ): Promise<SaveResponse> {
    return await postJson<SaveResponse, { updates: typeof updates }>(
      '/save',
      { updates },
      { headers: buildAuthHeaders(token) },
    );
  },
  async getTeacherReport(payload: TeacherLoginPayload): Promise<TeacherReportResponse> {
    const params = new URLSearchParams({
      class_code: payload.classCode,
      teacher_code: payload.teacherCode,
    });
    return await getJson<TeacherReportResponse>(`/teacher/report?${params.toString()}`);
  },
};
