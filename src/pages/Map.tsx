import { useSearchParams } from 'react-router-dom';

const standaloneMapPath = `${import.meta.env.BASE_URL}organic-map.html`;

export function Map() {
  const [searchParams] = useSearchParams();
  const selectedTopic = searchParams.get('topic');
  const selectedActivity = searchParams.get('activity');

  return (
    <section className="flex min-h-[calc(100vh-9rem)] flex-col">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-slate-100">Reaction Map</h2>
          <p className="text-sm text-slate-300">Open the standalone 3D map directly from the main app route.</p>
          {(selectedTopic || selectedActivity) && (
            <p className="mt-2 text-xs text-sky-300">
              Jumped from student focus:
              {selectedTopic ? ` topic ${selectedTopic}` : ''}
              {selectedActivity ? ` (${selectedActivity})` : ''}
            </p>
          )}
        </div>
        <a
          className="rounded-full bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-100 hover:bg-slate-700"
          href={standaloneMapPath}
          rel="noreferrer"
          target="_blank"
        >
          Open Standalone
        </a>
      </div>
      <div className="flex-1 overflow-hidden rounded-2xl border border-slate-800 bg-slate-950">
        <iframe
          className="h-full min-h-[70vh] w-full"
          src={standaloneMapPath}
          title="Organic chemistry reaction map"
        />
      </div>
    </section>
  );
}
