import type { ActivityDefinition } from './activities';

interface ActivityListProps {
  activities: ActivityDefinition[];
  selectedId: string;
  onSelect: (activityId: string) => void;
}

export function ActivityList({ activities, selectedId, onSelect }: ActivityListProps) {
  return (
    <div className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
      <h3 className="text-sm font-semibold text-slate-200">Activities</h3>
      <ul className="space-y-2">
        {activities.map((activity) => (
          <li key={activity.id}>
            <button
              type="button"
              onClick={() => onSelect(activity.id)}
              className={
                selectedId === activity.id
                  ? 'w-full rounded-xl border border-sky-500 bg-slate-900 px-4 py-3 text-left'
                  : 'w-full rounded-xl border border-slate-800 bg-slate-950/40 px-4 py-3 text-left hover:border-slate-600'
              }
            >
              <p className="text-sm font-semibold text-slate-100">{activity.title}</p>
              <p className="mt-1 text-xs text-slate-400">{activity.description}</p>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
