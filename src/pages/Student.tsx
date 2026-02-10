import { useState } from 'react';
import { JoinForm } from '../components/JoinForm';
import { getSessionToken, getStudentProfile } from '../api/session';
import { StudentDashboard } from '../student/StudentDashboard';

export function Student() {
  const [session, setSession] = useState(() => ({
    token: getSessionToken(),
    profile: getStudentProfile(),
  }));

  const handleJoin = () => {
    setSession({
      token: getSessionToken(),
      profile: getStudentProfile(),
    });
  };

  if (session.token && session.profile) {
    return <StudentDashboard profile={session.profile} />;
  }

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-3xl font-semibold">Student access</h2>
        <p className="mt-2 text-sm text-slate-300">
          Enter your class code, student code, and display name to join the session.
        </p>
      </div>
      <JoinForm onJoin={handleJoin} />
    </section>
  );
}
