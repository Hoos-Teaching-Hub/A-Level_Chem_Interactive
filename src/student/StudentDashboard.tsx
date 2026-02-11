import { useEffect, useMemo, useState } from 'react';
import type { StudentProfile } from '../api/session';
import {
  getLastSyncAt,
  getProgressMap,
  queueProgressUpdate,
  type ProgressMap,
  type ProgressRecord,
} from '../api/progress';
import { startBackgroundSync, syncProgress, type SyncResult } from '../api/sync';
import { mockActivities } from './mockActivities';
import { StudentStatusBar } from './StudentStatusBar';

type ActivityStatus = 'not_started' | 'in_progress' | 'complete';
type SyncStatus = 'idle' | 'syncing' | SyncResult['status'];

type StudentDashboardProps = {
  profile: StudentProfile;
};

const resolveStatus = (record?: ProgressRecord): ActivityStatus => {
  const status = record?.state?.status;
  if (status === 'complete' || status === 'in_progress' || status === 'not_started') {
    return status;
  }
  return 'not_started';
};

const statusLabels: Record<ActivityStatus, string> = {
  not_started: 'Not started',
  in_progress: 'In progress',
  complete: 'Complete',
};

const statusStyles: Record<ActivityStatus, string> = {
  not_started: 'border-slate-700 text-slate-300',
  in_progress: 'border-amber-500/40 text-amber-200',
  complete: 'border-emerald-500/40 text-emerald-200',
};

const formatUpdatedAt = (value?: string) => {
  if (!value) {
    return 'No activity yet';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Unknown';
  }
  return `Updated ${date.toLocaleString()}`;
};

export function StudentDashboard({ profile }: StudentDashboardProps) {
  const [selectedId, setSelectedId] = useState(() => mockActivities[0]?.id ?? '');
  const [progressMap, setProgressMap] = useState<ProgressMap>(() => getProgressMap());
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(() => getLastSyncAt());
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [syncError, setSyncError] = useState<string | null>(null);
  const [online, setOnline] = useState(() =>
    typeof navigator === 'undefined' ? true : navigator.onLine,
  );

  const refreshStorageSnapshot = () => {
    setProgressMap(getProgressMap());
    setLastSyncAt(getLastSyncAt());
  };

  const applySyncResult = (result: SyncResult) => {
    setSyncStatus(result.status);
    setSyncError(result.error ?? null);
    refreshStorageSnapshot();
  };

  useEffect(() => {
    const cleanup = startBackgroundSync(applySyncResult);
    return cleanup;
  }, []);

  useEffect(() => {
    const handleConnection = () =>
      setOnline(typeof navigator === 'undefined' ? true : navigator.onLine);
    window.addEventListener('online', handleConnection);
    window.addEventListener('offline', handleConnection);
    return () => {
      window.removeEventListener('online', handleConnection);
      window.removeEventListener('offline', handleConnection);
    };
  }, []);

  const pendingCount = useMemo(
    () => Object.values(progressMap).filter((record) => record.dirty).length,
    [progressMap],
  );

  const selectedActivity =
    mockActivities.find((activity) => activity.id === selectedId) ?? mockActivities[0];

  const handleSync = async () => {
    setSyncError(null);
    setSyncStatus('syncing');
    const result = await syncProgress('manual');
    applySyncResult(result);
  };

  const handleStatusChange = (activityId: string, nextStatus: ActivityStatus) => {
    queueProgressUpdate(activityId, { status: nextStatus });
    refreshStorageSnapshot();
  };

  if (!selectedActivity) {
    return (
      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 text-sm text-slate-300">
        No activities are available yet.
      </section>
    );
  }

  const selectedRecord = progressMap[selectedActivity.id];
  const selectedStatus = resolveStatus(selectedRecord);

  return (
    <section className="space-y-6">
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-lg">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Student session</p>
            <h2 className="text-3xl font-semibold">Welcome, {profile.displayName}</h2>
            <p className="mt-1 text-sm text-slate-400">Class code: {profile.classCode}</p>
          </div>
          <div className="text-sm text-slate-300">
            Focus set: {mockActivities.length} activities
          </div>
        </div>
      </div>

      <StudentStatusBar
        online={online}
        pendingCount={pendingCount}
        lastSyncAt={lastSyncAt}
        syncStatus={syncStatus}
        syncError={syncError}
        onSync={handleSync}
      />

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <div className="grid gap-3">
          {mockActivities.map((activity) => {
            const record = progressMap[activity.id];
            const status = resolveStatus(record);
            const isSelected = activity.id === selectedId;
            return (
              <button
                key={activity.id}
                type="button"
                onClick={() => setSelectedId(activity.id)}
                className={[
                  'rounded-2xl border p-4 text-left transition',
                  isSelected
                    ? 'border-sky-500/60 bg-slate-900/80'
                    : 'border-slate-800 bg-slate-900/50 hover:border-slate-700',
                ].join(' ')}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                      {activity.level} · {activity.topic}
                    </p>
                    <h3 className="text-base font-semibold">{activity.title}</h3>
                  </div>
                  <span
                    className={[
                      'rounded-full border px-2 py-1 text-[0.65rem] font-semibold uppercase tracking-wide',
                      statusStyles[status],
                    ].join(' ')}
                  >
                    {statusLabels[status]}
                  </span>
                </div>
                <p className="mt-2 text-sm text-slate-300">{activity.summary}</p>
                <p className="mt-3 text-xs text-slate-500">
                  Estimated: {activity.estimatedMinutes} min
                </p>
              </button>
            );
          })}
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Activity focus</p>
              <h3 className="text-2xl font-semibold">{selectedActivity.title}</h3>
              <p className="mt-1 text-sm text-slate-400">
                {selectedActivity.level} · {selectedActivity.topic}
              </p>
            </div>
            <span
              className={[
                'rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide',
                statusStyles[selectedStatus],
              ].join(' ')}
            >
              {statusLabels[selectedStatus]}
            </span>
          </div>

          <p className="mt-4 text-sm text-slate-200">{selectedActivity.summary}</p>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
              <h4 className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                What
              </h4>
              <p className="mt-2 text-sm text-slate-200">{selectedActivity.metadata.what}</p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
              <h4 className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                How
              </h4>
              <p className="mt-2 text-sm text-slate-200">{selectedActivity.metadata.how}</p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
              <h4 className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                Why
              </h4>
              <p className="mt-2 text-sm text-slate-200">{selectedActivity.metadata.why}</p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
              <h4 className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                Exam tip
              </h4>
              <p className="mt-2 text-sm text-slate-200">{selectedActivity.metadata.examTip}</p>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => handleStatusChange(selectedActivity.id, 'in_progress')}
              className="rounded-lg border border-slate-700 px-4 py-2 text-xs font-semibold text-slate-100 transition hover:border-slate-500"
            >
              Mark in progress
            </button>
            <button
              type="button"
              onClick={() => handleStatusChange(selectedActivity.id, 'complete')}
              className="rounded-lg bg-emerald-400/90 px-4 py-2 text-xs font-semibold text-slate-950 transition hover:bg-emerald-300"
            >
              Mark complete
            </button>
            <span className="text-xs text-slate-400">
              {formatUpdatedAt(selectedRecord?.updatedAt)}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
