import { RoleGate } from '../app/RoleGate';
import { useState } from 'react';
import { TeacherLoginForm } from '../components/TeacherLoginForm';
import { getTeacherClassCode, getTeacherCode } from '../api/session';
import { TeacherDashboard } from '../teacher/TeacherDashboard';

export function Teacher() {
  const [session, setSession] = useState(() => ({
    classCode: getTeacherClassCode(),
    teacherCode: getTeacherCode(),
  }));

  const handleLogin = () => {
    setSession({
      classCode: getTeacherClassCode(),
      teacherCode: getTeacherCode(),
    });
  };

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
        {session.classCode && session.teacherCode ? (
          <TeacherDashboard classCode={session.classCode} teacherCode={session.teacherCode} />
        ) : (
          <TeacherLoginForm onLogin={handleLogin} />
        )}
      </RoleGate>
    </section>
  );
}
