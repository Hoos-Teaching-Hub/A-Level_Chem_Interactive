import { NavLink, Outlet } from 'react-router-dom';

const linkClasses = ({ isActive }: { isActive: boolean }) =>
  [
    'rounded-full px-4 py-2 text-sm font-semibold transition',
    isActive ? 'bg-sky-500 text-slate-950' : 'bg-slate-800 text-slate-100 hover:bg-slate-700',
  ].join(' ');

export function App() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-6">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">A-Level Chemistry</p>
            <h1 className="text-2xl font-semibold">Interactive Portal</h1>
          </div>
          <nav className="flex gap-3">
            <NavLink to="/student" className={linkClasses}>
              Student
            </NavLink>
            <NavLink to="/teacher" className={linkClasses}>
              Teacher
            </NavLink>
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl px-6 py-10">
        <Outlet />
      </main>
    </div>
  );
}
