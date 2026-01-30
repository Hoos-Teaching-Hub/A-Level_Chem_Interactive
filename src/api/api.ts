import { z } from 'zod';
import { joinPayloadSchema } from '../validators/join';
import { teacherLoginSchema } from '../validators/teacher';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';

const DEFAULT_TIMEOUT_MS = 8000;
const DEFAULT_RETRIES = 2;

export type JoinPayload = z.infer<typeof joinPayloadSchema>;
export type TeacherLoginPayload = z.infer<typeof teacherLoginSchema>;

export interface JoinResponse {
  session_token: string;
  student?: {
    display_name?: string;
  };
}

export interface ActivityUpdate {
  activity_id: string;
  state: Record<string, unknown>;
  updated_at: string;
}

export interface LoadResponse {
  updates: ActivityUpdate[];
}

export interface SaveResponse {
  success?: boolean;
  updated_at?: string;
}

export interface TeacherReportResponse {
  summary?: Record<string, unknown>;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const shouldRetry = (response: Response | null, error: unknown) => {
  if (error) {
    return true;
  }
  if (!response) {
    return true;
  }
  return response.status >= 500 || response.status === 408;
};

async function fetchWithTimeout(input: RequestInfo, init: RequestInit, timeoutMs: number) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

async function requestJson<TResponse>(
  path: string,
  options: RequestInit = {},
  { timeoutMs = DEFAULT_TIMEOUT_MS, retries = DEFAULT_RETRIES } = {},
): Promise<TResponse> {
  const url = `${API_BASE_URL}${path}`;
  let attempt = 0;

  while (attempt <= retries) {
    let response: Response | null = null;
    let lastError: unknown = null;

    try {
      response = await fetchWithTimeout(url, options, timeoutMs);
      if (!response.ok) {
        const message = await response.text();
        if (shouldRetry(response, null) && attempt < retries) {
          attempt += 1;
          await sleep(300 * attempt);
          continue;
        }
        throw new Error(message || `Request failed (${response.status}).`);
      }
      return (await response.json()) as TResponse;
    } catch (error) {
      lastError = error;
      if (shouldRetry(response, error) && attempt < retries) {
        attempt += 1;
        await sleep(300 * attempt);
        continue;
      }
      throw lastError instanceof Error ? lastError : new Error('Request failed.');
    }
  }

  throw new Error('Request failed after retries.');
}

async function getJson<TResponse>(
  path: string,
  options?: Omit<RequestInit, 'method'>,
): Promise<TResponse> {
  return requestJson<TResponse>(path, { ...options, method: 'GET' });
}

async function postJson<TResponse, TBody>(
  path: string,
  body: TBody,
  options?: Omit<RequestInit, 'method' | 'body'>,
): Promise<TResponse> {
  return requestJson<TResponse>(path, {
    ...options,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers ?? {}),
    },
    body: JSON.stringify(body),
  });
}

const getAuthHeaders = (sessionToken?: string) =>
  sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {};

export const apiClient = {
  async join(payload: JoinPayload) {
    return postJson<JoinResponse, Record<string, string>>('/join', {
      class_code: payload.classCode,
      student_code: payload.studentCode,
      display_name: payload.displayName,
    });
  },
  async load(sessionToken: string, since?: string) {
    const search = new URLSearchParams();
    if (since) {
      search.set('since', since);
    }
    const query = search.toString();
    const path = query.length ? `/load?${query}` : '/load';
    return getJson<LoadResponse>(path, {
      headers: getAuthHeaders(sessionToken),
    });
  },
  async save(sessionToken: string, updates: ActivityUpdate[]) {
    return postJson<SaveResponse, { updates: ActivityUpdate[] }>(
      '/save',
      { updates },
      { headers: getAuthHeaders(sessionToken) },
    );
  },
  async teacherReport(payload: TeacherLoginPayload, sessionToken?: string) {
    const search = new URLSearchParams({
      class_code: payload.classCode,
      teacher_code: payload.teacherCode,
    });
    return getJson<TeacherReportResponse>(`/teacher/report?${search.toString()}`, {
      headers: getAuthHeaders(sessionToken),
    });
  },
};
