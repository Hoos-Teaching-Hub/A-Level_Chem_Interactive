import { TeacherLoginForm } from '../components/TeacherLoginForm';

export function Teacher() {
  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-3xl font-semibold">Teacher dashboard</h2>
        <p className="mt-2 text-sm text-slate-300">
          Use your teacher code and class code to access aggregated progress.
        </p>
      </div>
      <TeacherLoginForm />
    </section>
  );
}
