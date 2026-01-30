interface StudentStatusBarProps {
  studentName: string;
  lastSyncedAt: string | null;
  syncStatus: 'idle' | 'saving' | 'success' | 'error' | 'offline';
}

const statusCopy: Record<StudentStatusBarProps['syncStatus'], string> = {
  idle: 'Waiting for updates',
  saving: 'Syncing…',
  success: 'Synced',
  error: 'Sync failed',
  offline: 'Offline mode',
};

export function StudentStatusBar({ studentName, lastSyncedAt, syncStatus }: StudentStatusBarProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-900/60 px-6 py-4 text-sm text-slate-200">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Student</p>
        <p className="text-base font-semibold text-slate-100">{studentName || 'Guest learner'}</p>
      </div>
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Last synced</p>
        <p className="text-base font-semibold text-slate-100">
          {lastSyncedAt ? new Date(lastSyncedAt).toLocaleString() : 'Not yet'}
        </p>
      </div>
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Status</p>
        <p className="text-base font-semibold text-slate-100">{statusCopy[syncStatus]}</p>
      </div>
    </div>
  );
}
