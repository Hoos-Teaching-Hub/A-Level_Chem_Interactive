import { useEffect, useMemo, useState } from 'react';
import { apiClient, type TeacherReportResponse } from '../api/client';
import { downloadCsv } from './teacherCsv';

type TeacherDashboardProps = {
  classCode: string;
  teacherCode: string;
};

type LoadState = {
  status: 'idle' | 'loading' | 'ready' | 'error';
  report: TeacherReportResponse | null;
  error: string | null;
};

const sumBuckets = (buckets: Record<string, number>) =>
  Object.values(buckets).reduce((sum, value) => sum + (Number.isFinite(value) ? value : 0), 0);

const formatLastSeen = (value: string | null) => {
  if (!value) {
    return 'Not yet';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Unknown';
  }
  return date.toLocaleString();
};

export function TeacherDashboard({ classCode, teacherCode }: TeacherDashboardProps) {
  const [state, setState] = useState<LoadState>({
    status: 'idle',
    report: null,
    error: null,
  });
  const [search, setSearch] = useState('');

  const loadReport = async () => {
    setState((prev) => ({ ...prev, status: 'loading', error: null }));
    try {
      const report = await apiClient.getTeacherReport({ classCode, teacherCode });
      setState({ status: 'ready', report, error: null });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to load report.';
      setState({ status: 'error', report: null, error: message });
    }
  };

  useEffect(() => {
    let active = true;
    const run = async () => {
      setState((prev) => ({ ...prev, status: 'loading', error: null }));
      try {
        const report = await apiClient.getTeacherReport({ classCode, teacherCode });
        if (!active) {
          return;
        }
        setState({ status: 'ready', report, error: null });
      } catch (err) {
        if (!active) {
          return;
        }
        const message = err instanceof Error ? err.message : 'Unable to load report.';
        setState({ status: 'error', report: null, error: message });
      }
    };
    void run();
    return () => {
      active = false;
    };
  }, [classCode, teacherCode]);

  const activities = useMemo(() => {
    if (!state.report) {
      return [];
    }
    return [...state.report.activities]
      .map((activity) => ({
        ...activity,
        recentUpdates: sumBuckets(activity.updated_at_buckets),
      }))
      .sort((a, b) => b.total - a.total);
  }, [state.report]);

  const leaderboard = useMemo(() => {
    if (!state.report) {
      return [];
    }
    const query = search.trim().toLowerCase();
    return state.report.leaderboard
      .filter((row) =>
        query ? row.display_name.toLowerCase().includes(query) : true,
      )
      .sort((a, b) => b.completed - a.completed);
  }, [state.report, search]);

  const totalUpdates = activities.reduce((sum, activity) => sum + activity.total, 0);

  const handleExportLeaderboard = () => {
    if (!state.report) {
      return;
    }
    const rows = [
      ['Student', 'Completed', 'Last seen'],
      ...state.report.leaderboard.map((row) => [
        row.display_name,
        row.completed,
        formatLastSeen(row.last_seen_at),
      ]),
    ];
    downloadCsv(`teacher-${classCode}-leaderboard.csv`, rows);
  };

  const handleExportActivities = () => {
    if (!state.report) {
      return;
    }
    const rows = [
      ['Activity', 'Total updates', 'Recent updates'],
      ...activities.map((activity) => [
        activity.activity_id,
        activity.total,
        activity.recentUpdates,
      ]),
    ];
    downloadCsv(`teacher-${classCode}-activity-distribution.csv`, rows);
  };

  return (
    <section className="space-y-6">
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Class report</p>
            <h3 className="text-2xl font-semibold">Overview for {classCode}</h3>
          </div>
          <button
            type="button"
            onClick={loadReport}
            className="rounded-lg border border-slate-700 px-4 py-2 text-xs font-semibold text-slate-100 transition hover:border-slate-500"
          >
            Refresh report
          </button>
        </div>
        {state.status === 'loading' ? (
          <p className="mt-4 text-sm text-slate-300">Loading report...</p>
        ) : null}
        {state.status === 'error' ? (
          <p className="mt-4 text-sm text-rose-300">{state.error}</p>
        ) : null}
        {state.report ? (
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Students</p>
              <p className="mt-2 text-2xl font-semibold">{state.report.totals.students}</p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                Active last 24h
              </p>
              <p className="mt-2 text-2xl font-semibold">{state.report.totals.active_last_24h}</p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Total updates</p>
              <p className="mt-2 text-2xl font-semibold">{totalUpdates}</p>
            </div>
          </div>
        ) : null}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h4 className="text-lg font-semibold">Leaderboard</h4>
            <button
              type="button"
              onClick={handleExportLeaderboard}
              className="rounded-lg border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-100 transition hover:border-slate-500"
            >
              Export CSV
            </button>
          </div>
          <label className="mt-4 block text-xs uppercase tracking-[0.2em] text-slate-400">
            Search students
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Type a name"
              className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
            />
          </label>
          <div className="mt-4 grid gap-3">
            {leaderboard.length ? (
              leaderboard.map((row) => (
                <div
                  key={row.student_id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-800 bg-slate-950/50 px-4 py-3 text-sm"
                >
                  <div>
                    <p className="font-semibold text-slate-100">{row.display_name}</p>
                    <p className="text-xs text-slate-400">{formatLastSeen(row.last_seen_at)}</p>
                  </div>
                  <span className="rounded-full border border-slate-700 px-3 py-1 text-xs font-semibold text-slate-200">
                    {row.completed} completed
                  </span>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-400">No matching students yet.</p>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h4 className="text-lg font-semibold">Activity distribution</h4>
            <button
              type="button"
              onClick={handleExportActivities}
              className="rounded-lg border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-100 transition hover:border-slate-500"
            >
              Export activities CSV
            </button>
          </div>
          <div className="mt-4 grid gap-3">
            {activities.length ? (
              activities.map((activity) => (
                <div
                  key={activity.activity_id}
                  className="rounded-lg border border-slate-800 bg-slate-950/50 px-4 py-3 text-sm"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="font-semibold text-slate-100">{activity.activity_id}</p>
                    <span className="rounded-full border border-slate-700 px-3 py-1 text-xs font-semibold text-slate-200">
                      {activity.total} updates
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-slate-400">
                    Recent updates: {activity.recentUpdates}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-400">No activity updates yet.</p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
