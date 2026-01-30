import { TeacherLoginForm } from '../components/TeacherLoginForm';
import { RoleGate } from '../app/RoleGate';

export function Teacher() {
  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-3xl font-semibold">Teacher dashboard</h2>
        <p className="mt-2 text-sm text-slate-300">
          Use your teacher code and class code to access aggregated progress.
        </p>
      </div>
      <RoleGate
        blockedRoles={['student']}
        fallback={
          <p className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 text-sm text-slate-300">
            Teacher access is unavailable while you are signed in as a student. Return to the
            student route to continue learning.
          </p>
        }
      >
        <TeacherLoginForm />
      </RoleGate>
    </section>
  );
}
