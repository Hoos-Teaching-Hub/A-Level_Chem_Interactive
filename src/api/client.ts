import { z } from 'zod';
import { joinPayloadSchema } from '../validators/join';
import { teacherLoginSchema } from '../validators/teacher';

// Base URL for edge function requests. When unset we fall back to same-origin,
// which lets local dev and static preview environments call relative endpoints
// without extra configuration.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';

export async function getJson<TResponse>(
  path: string,
  options?: Omit<RequestInit, 'method'>,
): Promise<TResponse> {
  // Placeholder implementation to keep UI wiring intact before backend integration.
  // The real implementation should:
  // 1) Build the full URL: `${API_BASE_URL}${path}`.
  // 2) Set `Accept: application/json` headers.
  // 3) Throw on non-2xx responses with useful error messages for the UI.
  // 4) Parse and return JSON as `TResponse`.
  void options;
  void path;
  void API_BASE_URL;
  return Promise.resolve({} as TResponse);
}

export async function postJson<TResponse, TBody>(
  path: string,
  body: TBody,
  options?: Omit<RequestInit, 'method' | 'body'>,
): Promise<TResponse> {
  // Placeholder implementation to keep UI wiring intact before backend integration.
  // The real implementation should:
  // 1) Build the full URL: `${API_BASE_URL}${path}`.
  // 2) Serialize `body` to JSON and attach `Content-Type: application/json`.
  // 3) Throw on non-2xx responses with useful error messages for the UI.
  // 4) Parse and return JSON as `TResponse`.
  void options;
  void path;
  void body;
  void API_BASE_URL;
  return Promise.resolve({} as TResponse);
}

export const apiClient = {
  async join(payload: z.infer<typeof joinPayloadSchema>) {
    await postJson('/join', payload);
  },
  async teacherLogin(payload: z.infer<typeof teacherLoginSchema>) {
    await postJson('/teacher/login', payload);
  },
};
