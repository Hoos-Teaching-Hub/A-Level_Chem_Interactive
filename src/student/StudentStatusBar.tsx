import type { SyncResult } from '../api/sync';

type SyncStatus = 'idle' | 'syncing' | SyncResult['status'];

type StudentStatusBarProps = {
  online: boolean;
  pendingCount: number;
  lastSyncAt: string | null;
  syncStatus: SyncStatus;
  syncError?: string | null;
  onSync: () => void;
};

const statusLabels: Record<SyncStatus, string> = {
  idle: 'Not synced yet',
  syncing: 'Syncing...',
  synced: 'All changes synced',
  offline: 'Offline, changes queued',
  skipped: 'Sign in to sync',
  error: 'Sync failed',
};

const formatTimestamp = (value: string | null) => {
  if (!value) {
    return 'Not yet';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Unavailable';
  }
  return date.toLocaleString();
};

export function StudentStatusBar({
  online,
  pendingCount,
  lastSyncAt,
  syncStatus,
  syncError,
  onSync,
}: StudentStatusBarProps) {
  return (
    <div className="grid gap-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-4 md:grid-cols-[1fr_auto]">
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Connection</p>
          <p className="text-sm font-semibold">{online ? 'Online' : 'Offline'}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Last sync</p>
          <p className="text-sm font-semibold">{formatTimestamp(lastSyncAt)}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Pending updates</p>
          <p className="text-sm font-semibold">{pendingCount}</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 md:justify-end">
        <div className="text-xs text-slate-400" aria-live="polite">
          Status: <span className="font-semibold text-slate-200">{statusLabels[syncStatus]}</span>
        </div>
        {syncError ? <p className="text-xs text-rose-300">{syncError}</p> : null}
        <button
          type="button"
          onClick={onSync}
          className="rounded-lg border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-100 transition hover:border-slate-500"
        >
          Sync now
        </button>
      </div>
    </div>
  );
}
