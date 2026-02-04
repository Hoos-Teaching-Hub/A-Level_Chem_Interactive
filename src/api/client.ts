import { z } from 'zod';
import { joinPayloadSchema } from '../validators/join';
import { teacherLoginSchema } from '../validators/teacher';

// Base URL for edge function requests. When unset we fall back to same-origin,
// which lets local dev and static preview environments call relative endpoints
// without extra configuration.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';

type ApiErrorPayload = {
  error?: {
    message?: string;
    code?: string;
  };
};

type JsonValue = Record<string, unknown> | Array<unknown> | string | number | boolean | null;

const buildUrl = (path: string) => {
  if (!API_BASE_URL) {
    return path;
  }
  const base = API_BASE_URL.replace(/\/$/, '');
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

const parseJsonBody = async (response: Response): Promise<JsonValue | null> => {
  const raw = await response.text();
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as JsonValue;
  } catch {
    throw new Error('Invalid JSON response.');
  }
};

const handleJsonResponse = async <TResponse>(response: Response): Promise<TResponse> => {
  const payload = await parseJsonBody(response);
  if (!response.ok) {
    const message =
      (payload as ApiErrorPayload | null)?.error?.message ??
      response.statusText ??
      'Request failed.';
    throw new Error(message);
  }
  return payload as TResponse;
};

export async function getJson<TResponse>(
  path: string,
  options?: Omit<RequestInit, 'method'>,
): Promise<TResponse> {
  const response = await fetch(buildUrl(path), {
    ...options,
    method: 'GET',
    headers: mergeHeaders(options?.headers, { Accept: 'application/json' }),
  });
  return await handleJsonResponse<TResponse>(response);
}

export async function postJson<TResponse, TBody>(
  path: string,
  body: TBody,
  options?: Omit<RequestInit, 'method' | 'body'>,
): Promise<TResponse> {
  const response = await fetch(buildUrl(path), {
    ...options,
    method: 'POST',
    body: JSON.stringify(body),
    headers: mergeHeaders(options?.headers, {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    }),
  });
  return await handleJsonResponse<TResponse>(response);
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
