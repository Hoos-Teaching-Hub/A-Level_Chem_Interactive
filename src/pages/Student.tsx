import { JoinForm } from '../components/JoinForm';

export function Student() {
  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-3xl font-semibold">Student access</h2>
        <p className="mt-2 text-sm text-slate-300">
          Enter your class code, student code, and display name to join the session.
        </p>
      </div>
      <JoinForm />
    </section>
  );
}
