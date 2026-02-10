import { useState } from 'react';
import { z } from 'zod';
import { teacherLoginSchema } from '../validators/teacher';
import { apiClient } from '../api/client';
import { setStoredRole } from '../app/roleStore';
import { setTeacherClassCode, setTeacherCode } from '../api/session';

type TeacherLoginPayload = z.infer<typeof teacherLoginSchema>;

type TeacherLoginFormProps = {
  onLogin?: () => void;
};

const initialState: TeacherLoginPayload = {
  classCode: '',
  teacherCode: '',
};

export function TeacherLoginForm({ onLogin }: TeacherLoginFormProps) {
  const [values, setValues] = useState<TeacherLoginPayload>(initialState);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setValues((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const parsed = teacherLoginSchema.safeParse(values);
    if (!parsed.success) {
      setError(parsed.error.errors[0]?.message ?? 'Invalid input.');
      return;
    }

    try {
      await apiClient.getTeacherReport(parsed.data);
      setTeacherCode(parsed.data.teacherCode);
      setTeacherClassCode(parsed.data.classCode);
      setStoredRole('teacher');
      onLogin?.();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to sign in right now.';
      setError(message);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="grid gap-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-lg"
    >
      <label className="grid gap-2 text-sm">
        Class code
        <input
          name="classCode"
          value={values.classCode}
          onChange={handleChange}
          placeholder="e.g. CHEM-12A"
          className="rounded-lg border border-slate-700 bg-slate-950 px-4 py-2"
          required
        />
      </label>
      <label className="grid gap-2 text-sm">
        Teacher code
        <input
          name="teacherCode"
          value={values.teacherCode}
          onChange={handleChange}
          placeholder="e.g. T-9061"
          className="rounded-lg border border-slate-700 bg-slate-950 px-4 py-2"
          required
        />
      </label>
      {error ? <p className="text-sm text-rose-300">{error}</p> : null}
      <button
        type="submit"
        className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950"
      >
        Continue
      </button>
    </form>
  );
}
