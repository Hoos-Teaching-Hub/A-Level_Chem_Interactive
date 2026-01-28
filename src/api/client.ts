import { z } from 'zod';
import { joinPayloadSchema } from '../validators/join';
import { teacherLoginSchema } from '../validators/teacher';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';

export async function getJson<TResponse>(
  path: string,
  options?: Omit<RequestInit, 'method'>,
): Promise<TResponse> {
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
