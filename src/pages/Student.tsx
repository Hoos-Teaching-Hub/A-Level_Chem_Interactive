import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/api';
import { ActivityList } from '../student/ActivityList';
import { ActivityPage } from '../student/ActivityPage';
import { StudentJoinForm } from '../student/StudentJoinForm';
import { StudentStatusBar } from '../student/StudentStatusBar';
import { activities } from '../student/activities';
import {
  ActivityProgress,
  getAllProgress,
  getDisplayName,
  getLastSyncedAt,
  getSessionToken,
  mergeProgress,
  persistProgressMap,
  setActivityProgress,
  setDisplayName,
  setLastSyncedAt,
  setSessionToken,
} from '../student/storage';

const offlineJoinMessage =
  'Unable to reach the server. You are now in offline mode and progress will be stored locally.';
const offlineSaveMessage =
  'Saved locally. Reconnect to sync, or retry manually when you are back online.';

export function Student() {
  const [sessionToken, setSessionTokenState] = useState<string | null>(() => getSessionToken());
  const [studentName, setStudentName] = useState<string>(() => getDisplayName());
  const [selectedActivityId, setSelectedActivityId] = useState<string>(activities[0]?.id ?? '');
  const [progressMap, setProgressMap] = useState<Record<string, ActivityProgress>>(() =>
    getAllProgress(activities),
  );
  const [syncStatus, setSyncStatus] = useState<'idle' | 'saving' | 'success' | 'error' | 'offline'>(
    sessionToken ? 'idle' : 'offline',
  );
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [pendingUpdates, setPendingUpdates] = useState<Record<string, ActivityProgress>>({});
  const [lastSyncedAt, setLastSyncedAtState] = useState<string | null>(() => getLastSyncedAt());

  const selectedActivity = useMemo(
    () => activities.find((activity) => activity.id === selectedActivityId) ?? activities[0],
    [selectedActivityId],
  );

  const joinMutation = useMutation({
    mutationFn: apiClient.join,
    onSuccess: (data, variables) => {
      setSyncMessage(null);
      const token = data.session_token || `local-${Date.now()}`;
      setSessionTokenState(token);
      setSessionToken(token);
      setDisplayName(variables.displayName);
      setStudentName(variables.displayName);
      setSyncStatus('idle');
    },
    onError: (error, variables) => {
      const token = `local-${Date.now()}`;
      setSessionTokenState(token);
      setSessionToken(token);
      setDisplayName(variables.displayName);
      setStudentName(variables.displayName);
      setSyncStatus('offline');
      setSyncMessage(offlineJoinMessage);
      console.error(error);
    },
  });

  const loadQuery = useQuery({
    queryKey: ['student-progress', sessionToken],
    queryFn: async () => {
      if (!sessionToken) {
        return null;
      }
      return apiClient.load(sessionToken, lastSyncedAt ?? undefined);
    },
    enabled: Boolean(sessionToken),
    onSuccess: (data) => {
      if (!data) {
        return;
      }
      // Merge remote updates into local progress using the newest updated_at timestamp.
      setProgressMap((current) => {
        const merged = mergeProgress(current, data.updates ?? []);
        persistProgressMap(merged);
        return merged;
      });
      const now = new Date().toISOString();
      setLastSyncedAt(now);
      setLastSyncedAtState(now);
      setSyncStatus('success');
      setSyncMessage(null);
    },
    onError: () => {
      setSyncStatus('error');
      setSyncMessage(offlineSaveMessage);
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (updates: ActivityProgress[]) => {
      if (!sessionToken) {
        throw new Error('Missing session token.');
      }
      return apiClient.save(sessionToken, updates.map((update) => ({
        activity_id: update.activityId,
        state: update.answers,
        updated_at: update.updatedAt,
      })));
    },
    onMutate: () => {
      setSyncStatus('saving');
      setSyncMessage(null);
    },
    onSuccess: () => {
      const now = new Date().toISOString();
      setLastSyncedAt(now);
      setLastSyncedAtState(now);
      setSyncStatus('success');
      setSyncMessage(null);
      setPendingUpdates({});
    },
    onError: () => {
      setSyncStatus('error');
      setSyncMessage(offlineSaveMessage);
    },
  });

  useEffect(() => {
    if (sessionToken && syncStatus === 'offline') {
      setSyncStatus('idle');
    }
  }, [sessionToken, syncStatus]);

  const handleJoin = (values: { classCode: string; studentCode: string; displayName: string }) => {
    joinMutation.mutate(values);
  };

  const handleAnswer = (questionId: string, answer: string) => {
    if (!selectedActivity) {
      return;
    }
    const updatedAt = new Date().toISOString();
    const existing = progressMap[selectedActivity.id];
    const nextProgress: ActivityProgress = {
      activityId: selectedActivity.id,
      answers: {
        ...(existing?.answers ?? {}),
        [questionId]: answer,
      },
      updatedAt,
    };

    const nextMap = { ...progressMap, [selectedActivity.id]: nextProgress };
    setProgressMap(nextMap);
    // Persist locally first so progress survives refreshes or offline sessions.
    setActivityProgress(nextProgress);

    const nextPending = { ...pendingUpdates, [selectedActivity.id]: nextProgress };
    setPendingUpdates(nextPending);

    if (sessionToken) {
      // Attempt to sync immediately; failures fall back to manual retry.
      saveMutation.mutate([nextProgress]);
    } else {
      setSyncStatus('offline');
      setSyncMessage(offlineSaveMessage);
    }
  };

  const handleRetry = () => {
    const updates = Object.values(pendingUpdates);
    if (!updates.length || !sessionToken) {
      return;
    }
    saveMutation.mutate(updates);
  };

  if (!sessionToken) {
    return (
      <section className="space-y-6">
        <div>
          <h2 className="text-3xl font-semibold">Student access</h2>
          <p className="mt-2 text-sm text-slate-300">
            Enter your class code, student code, and display name to join the session.
          </p>
        </div>
        <StudentJoinForm onJoin={handleJoin} isLoading={joinMutation.isPending} error={syncMessage} />
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <StudentStatusBar
        studentName={studentName}
        lastSyncedAt={lastSyncedAt}
        syncStatus={syncStatus}
      />
      {syncMessage ? (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          <p>{syncMessage}</p>
          {syncStatus === 'error' && pendingUpdates && Object.keys(pendingUpdates).length > 0 ? (
            <button
              type="button"
              onClick={handleRetry}
              className="mt-3 rounded-lg border border-amber-400 px-3 py-1 text-xs font-semibold text-amber-100"
            >
              Retry sync
            </button>
          ) : null}
        </div>
      ) : null}
      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        <ActivityList
          activities={activities}
          selectedId={selectedActivity?.id ?? ''}
          onSelect={setSelectedActivityId}
        />
        {selectedActivity ? (
          <ActivityPage
            activity={selectedActivity}
            progress={progressMap[selectedActivity.id] ?? null}
            onAnswer={handleAnswer}
          />
        ) : null}
      </div>
      {loadQuery.isFetching ? (
        <p className="text-xs text-slate-400">Loading latest progress…</p>
      ) : null}
    </section>
  );
}
