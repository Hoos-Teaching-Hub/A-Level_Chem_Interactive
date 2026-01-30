import type { ActivityDefinition } from './activities';
import type { ActivityProgress } from './storage';

interface ActivityPageProps {
  activity: ActivityDefinition;
  progress: ActivityProgress | null;
  onAnswer: (questionId: string, answer: string) => void;
}

export function ActivityPage({ activity, progress, onAnswer }: ActivityPageProps) {
  return (
    <div className="space-y-6 rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
      <div>
        <h3 className="text-xl font-semibold text-slate-100">{activity.title}</h3>
        <p className="mt-2 text-sm text-slate-300">{activity.description}</p>
      </div>
      <div className="space-y-5">
        {activity.questions.map((question) => (
          <div key={question.id} className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
            <p className="text-sm font-semibold text-slate-100">{question.prompt}</p>
            <div className="mt-3 grid gap-2 text-sm text-slate-300">
              {question.options.map((option) => (
                <label key={option} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name={question.id}
                    value={option}
                    checked={progress?.answers?.[question.id] === option}
                    onChange={() => onAnswer(question.id, option)}
                    className="h-4 w-4 accent-sky-500"
                  />
                  {option}
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
