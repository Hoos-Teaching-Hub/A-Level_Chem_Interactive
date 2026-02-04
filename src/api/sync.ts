import { apiClient } from './client';
import { getSessionToken } from './session';
import {
  applySaveResponse,
  getLastSyncAt,
  getPendingUpdates,
  mergeRemoteProgress,
  setLastSyncAt,
} from './progress';

export type SyncResult = {
  status: 'skipped' | 'offline' | 'synced' | 'error';
  reason: string;
  saved: number;
  loaded: number;
  lastSyncAt?: string;
  error?: string;
};

let inFlight: Promise<SyncResult> | null = null;

const getLatestTimestamp = (...values: Array<string | null | undefined>) => {
  const valid = values.filter((value): value is string => Boolean(value));
  if (!valid.length) {
    return null;
  }
  return valid.reduce((latest, current) =>
    new Date(current).getTime() > new Date(latest).getTime() ? current : latest,
  );
};

export const syncProgress = async (reason = 'manual'): Promise<SyncResult> => {
  if (inFlight) {
    return await inFlight;
  }

  const runner = async (): Promise<SyncResult> => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return { status: 'offline', reason, saved: 0, loaded: 0 };
    }

    const token = getSessionToken();
    if (!token) {
      return { status: 'skipped', reason, saved: 0, loaded: 0 };
    }

    const lastSyncAt = getLastSyncAt();
    const pending = getPendingUpdates();
    let saveUpdatedAt: string | null = null;

    if (pending.length) {
      const saveResponse = await apiClient.saveProgress(token, pending);
      applySaveResponse(saveResponse);
      saveUpdatedAt = saveResponse.updated_at;
    }

    const loadResponse = await apiClient.loadProgress(token, lastSyncAt ?? undefined);
    const mergeResult = mergeRemoteProgress(loadResponse.progress);

    const nextSyncAt = getLatestTimestamp(
      lastSyncAt,
      saveUpdatedAt,
      mergeResult.latestRemoteAt,
    );
    if (nextSyncAt) {
      setLastSyncAt(nextSyncAt);
    }

    return {
      status: 'synced',
      reason,
      saved: pending.length,
      loaded: loadResponse.progress.length,
      lastSyncAt: nextSyncAt ?? undefined,
    };
  };

  inFlight = runner()
    .catch((err: unknown) => {
      const message = err instanceof Error ? err.message : 'Unable to sync.';
      return { status: 'error', reason, saved: 0, loaded: 0, error: message };
    })
    .finally(() => {
      inFlight = null;
    });

  return await inFlight;
};

export const startBackgroundSync = () => {
  if (typeof window === 'undefined') {
    return () => undefined;
  }

  const handleOnline = () => {
    void syncProgress('online');
  };

  const handleVisibility = () => {
    if (document.visibilityState === 'visible') {
      void syncProgress('visible');
    }
  };

  window.addEventListener('online', handleOnline);
  document.addEventListener('visibilitychange', handleVisibility);

  void syncProgress('startup');

  return () => {
    window.removeEventListener('online', handleOnline);
    document.removeEventListener('visibilitychange', handleVisibility);
  };
};
