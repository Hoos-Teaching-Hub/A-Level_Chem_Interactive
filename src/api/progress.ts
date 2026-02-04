import type { RawProgressRecord } from './client';

export type ProgressRecord = {
  activityId: string;
  state: Record<string, unknown>;
  updatedAt: string;
  dirty: boolean;
};

export type ProgressMap = Record<string, ProgressRecord>;

const PROGRESS_KEY = 'chem.progress';
const LAST_SYNC_KEY = 'chem.lastSyncAt';

const getStorage = (): Storage | null => {
  if (typeof window === 'undefined') {
    return null;
  }
  return window.localStorage;
};

const readJson = <T>(key: string): T | null => {
  const storage = getStorage();
  if (!storage) {
    return null;
  }
  const raw = storage.getItem(key);
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
};

const writeJson = (key: string, value: unknown) => {
  const storage = getStorage();
  if (!storage) {
    return;
  }
  try {
    storage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage failures to keep the app usable.
  }
};

const removeKey = (key: string) => {
  const storage = getStorage();
  if (!storage) {
    return;
  }
  storage.removeItem(key);
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const parseTimestamp = (value: string): number => {
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
};

const toProgressRecord = (record: RawProgressRecord, dirty = false): ProgressRecord => ({
  activityId: record.activity_id,
  state: isRecord(record.state) ? record.state : {},
  updatedAt: record.updated_at,
  dirty,
});

export const getProgressMap = (): ProgressMap => {
  const raw = readJson<Record<string, unknown>>(PROGRESS_KEY);
  if (!raw || !isRecord(raw)) {
    return {};
  }

  const map: ProgressMap = {};
  Object.entries(raw).forEach(([key, value]) => {
    if (!isRecord(value)) {
      return;
    }
    const updatedAt = typeof value.updatedAt === 'string' ? value.updatedAt : new Date(0).toISOString();
    map[key] = {
      activityId: key,
      state: isRecord(value.state) ? value.state : {},
      updatedAt,
      dirty: typeof value.dirty === 'boolean' ? value.dirty : false,
    };
  });

  return map;
};

export const setProgressMap = (map: ProgressMap) => {
  writeJson(PROGRESS_KEY, map);
};

export const getLastSyncAt = (): string | null => {
  const raw = readJson<string>(LAST_SYNC_KEY);
  return typeof raw === 'string' ? raw : null;
};

export const setLastSyncAt = (value: string | null) => {
  if (!value) {
    removeKey(LAST_SYNC_KEY);
    return;
  }
  writeJson(LAST_SYNC_KEY, value);
};

export const replaceProgressFromJoin = (records: RawProgressRecord[]): string | null => {
  const map: ProgressMap = {};
  let latest: string | null = null;

  records.forEach((record) => {
    map[record.activity_id] = toProgressRecord(record, false);
    if (!latest || parseTimestamp(record.updated_at) > parseTimestamp(latest)) {
      latest = record.updated_at;
    }
  });

  setProgressMap(map);
  return latest;
};

export const queueProgressUpdate = (activityId: string, state: Record<string, unknown>) => {
  const map = getProgressMap();
  const updatedAt = new Date().toISOString();
  map[activityId] = {
    activityId,
    state,
    updatedAt,
    dirty: true,
  };
  setProgressMap(map);
  return map[activityId];
};

export const getPendingUpdates = () =>
  Object.values(getProgressMap())
    .filter((record) => record.dirty)
    .map((record) => ({
      activity_id: record.activityId,
      state: record.state,
    }));

export const applySaveResponse = (response: {
  updated_at: string;
  progress: Array<{ activity_id: string; updated_at: string }>;
}) => {
  const map = getProgressMap();
  response.progress.forEach((row) => {
    const existing = map[row.activity_id];
    if (!existing) {
      return;
    }
    map[row.activity_id] = {
      ...existing,
      updatedAt: row.updated_at ?? response.updated_at,
      dirty: false,
    };
  });
  setProgressMap(map);
};

export const mergeRemoteProgress = (records: RawProgressRecord[]) => {
  const map = getProgressMap();
  let latest: string | null = null;

  records.forEach((record) => {
    // Conflict resolution: remote updates only replace local state when the
    // remote `updated_at` is newer than the local timestamp.
    if (!latest || parseTimestamp(record.updated_at) > parseTimestamp(latest)) {
      latest = record.updated_at;
    }

    const local = map[record.activity_id];
    const remoteTime = parseTimestamp(record.updated_at);
    const localTime = local ? parseTimestamp(local.updatedAt) : 0;

    if (!local || remoteTime > localTime) {
      map[record.activity_id] = toProgressRecord(record, false);
    }
  });

  setProgressMap(map);

  return {
    latestRemoteAt: latest,
    mergedCount: records.length,
  };
};
