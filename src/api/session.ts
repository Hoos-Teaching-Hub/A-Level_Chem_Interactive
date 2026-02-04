import type { JoinResponse } from './client';
import { replaceProgressFromJoin, setLastSyncAt } from './progress';

export type StudentProfile = {
  id: string;
  classCode: string;
  displayName: string;
  createdAt?: string | null;
  lastSeenAt?: string | null;
};

const SESSION_TOKEN_KEY = 'chem.sessionToken';
const STUDENT_PROFILE_KEY = 'chem.studentProfile';
const TEACHER_CODE_KEY = 'chem.teacherCode';

const getStorage = (kind: 'local' | 'session'): Storage | null => {
  if (typeof window === 'undefined') {
    return null;
  }
  return kind === 'local' ? window.localStorage : window.sessionStorage;
};

const readString = (key: string, kind: 'local' | 'session'): string | null => {
  const storage = getStorage(kind);
  if (!storage) {
    return null;
  }
  return storage.getItem(key);
};

const writeString = (key: string, value: string, kind: 'local' | 'session') => {
  const storage = getStorage(kind);
  if (!storage) {
    return;
  }
  storage.setItem(key, value);
};

const removeKey = (key: string, kind: 'local' | 'session') => {
  const storage = getStorage(kind);
  if (!storage) {
    return;
  }
  storage.removeItem(key);
};

const readJson = <T>(key: string, kind: 'local' | 'session'): T | null => {
  const raw = readString(key, kind);
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
};

const writeJson = (key: string, value: unknown, kind: 'local' | 'session') => {
  try {
    writeString(key, JSON.stringify(value), kind);
  } catch {
    // Ignore quota/serialization errors to keep UI responsive.
  }
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const coerceStudentProfile = (value: unknown): StudentProfile | null => {
  if (!isRecord(value)) {
    return null;
  }
  const id = typeof value.id === 'string' ? value.id : null;
  const classCode = typeof value.classCode === 'string' ? value.classCode : null;
  const displayName = typeof value.displayName === 'string' ? value.displayName : null;
  if (!id || !classCode || !displayName) {
    return null;
  }
  return {
    id,
    classCode,
    displayName,
    createdAt: typeof value.createdAt === 'string' ? value.createdAt : null,
    lastSeenAt: typeof value.lastSeenAt === 'string' ? value.lastSeenAt : null,
  };
};

export const getSessionToken = (): string | null => readString(SESSION_TOKEN_KEY, 'local');

export const setSessionToken = (token: string) => {
  writeString(SESSION_TOKEN_KEY, token, 'local');
};

export const clearSessionToken = () => {
  removeKey(SESSION_TOKEN_KEY, 'local');
};

export const getStudentProfile = (): StudentProfile | null =>
  coerceStudentProfile(readJson<StudentProfile>(STUDENT_PROFILE_KEY, 'local'));

export const setStudentProfile = (profile: StudentProfile) => {
  writeJson(STUDENT_PROFILE_KEY, profile, 'local');
};

export const clearStudentProfile = () => {
  removeKey(STUDENT_PROFILE_KEY, 'local');
};

export const getTeacherCode = (): string | null => readString(TEACHER_CODE_KEY, 'session');

export const setTeacherCode = (teacherCode: string) => {
  writeString(TEACHER_CODE_KEY, teacherCode, 'session');
};

export const clearTeacherCode = () => {
  removeKey(TEACHER_CODE_KEY, 'session');
};

export const storeJoinResponse = (response: JoinResponse): StudentProfile => {
  const profile: StudentProfile = {
    id: response.student_profile.id,
    classCode: response.student_profile.class_code,
    displayName: response.student_profile.display_name,
    createdAt: response.student_profile.created_at ?? null,
    lastSeenAt: response.student_profile.last_seen_at ?? null,
  };

  setSessionToken(response.session_token);
  setStudentProfile(profile);

  const latestSync = replaceProgressFromJoin(response.progress);
  setLastSyncAt(latestSync);

  return profile;
};
