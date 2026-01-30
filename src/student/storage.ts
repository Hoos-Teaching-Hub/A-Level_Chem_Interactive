import type { ActivityDefinition } from './activities';
import type { ActivityUpdate } from '../api/api';

const SESSION_TOKEN_KEY = 'chem.session_token';
const DISPLAY_NAME_KEY = 'chem.display_name';
const TEACHER_CODE_KEY = 'chem.teacher_code';
const LAST_SYNCED_KEY = 'chem.last_synced_at';
const PROGRESS_PREFIX = 'chem.progress.';

export interface ActivityProgress {
  activityId: string;
  answers: Record<string, string>;
  updatedAt: string;
}

export const getSessionToken = () => localStorage.getItem(SESSION_TOKEN_KEY);

export const setSessionToken = (token: string) => {
  localStorage.setItem(SESSION_TOKEN_KEY, token);
};

export const getDisplayName = () => localStorage.getItem(DISPLAY_NAME_KEY) ?? '';

export const setDisplayName = (name: string) => {
  localStorage.setItem(DISPLAY_NAME_KEY, name);
};

export const getTeacherCode = () => sessionStorage.getItem(TEACHER_CODE_KEY);

export const setTeacherCode = (code: string) => {
  sessionStorage.setItem(TEACHER_CODE_KEY, code);
};

export const getLastSyncedAt = () => localStorage.getItem(LAST_SYNCED_KEY);

export const setLastSyncedAt = (timestamp: string) => {
  localStorage.setItem(LAST_SYNCED_KEY, timestamp);
};

const progressKey = (activityId: string) => `${PROGRESS_PREFIX}${activityId}`;

export const getActivityProgress = (activityId: string): ActivityProgress | null => {
  const raw = localStorage.getItem(progressKey(activityId));
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as ActivityProgress;
    return parsed;
  } catch {
    return null;
  }
};

export const setActivityProgress = (progress: ActivityProgress) => {
  localStorage.setItem(progressKey(progress.activityId), JSON.stringify(progress));
};

export const getAllProgress = (activities: ActivityDefinition[]) => {
  const progressMap: Record<string, ActivityProgress> = {};
  activities.forEach((activity) => {
    const stored = getActivityProgress(activity.id);
    if (stored) {
      progressMap[activity.id] = stored;
    }
  });
  return progressMap;
};

export const toActivityUpdates = (progressMap: Record<string, ActivityProgress>): ActivityUpdate[] =>
  Object.values(progressMap).map((progress) => ({
    activity_id: progress.activityId,
    state: progress.answers,
    updated_at: progress.updatedAt,
  }));

export const mergeProgress = (
  local: Record<string, ActivityProgress>,
  remoteUpdates: ActivityUpdate[],
) => {
  const merged: Record<string, ActivityProgress> = { ...local };

  remoteUpdates.forEach((update) => {
    const existing = merged[update.activity_id];
    const remoteTime = new Date(update.updated_at).getTime();
    const localTime = existing ? new Date(existing.updatedAt).getTime() : 0;

    if (!existing || remoteTime >= localTime) {
      merged[update.activity_id] = {
        activityId: update.activity_id,
        answers: (update.state as Record<string, string>) ?? {},
        updatedAt: update.updated_at,
      };
    }
  });

  return merged;
};

export const persistProgressMap = (progressMap: Record<string, ActivityProgress>) => {
  Object.values(progressMap).forEach((progress) => {
    setActivityProgress(progress);
  });
};
