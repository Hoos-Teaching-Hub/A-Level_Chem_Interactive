import { useState } from 'react';
import { z } from 'zod';
import { joinPayloadSchema } from '../validators/join';
import { apiClient } from '../api/client';
import { setStoredRole } from '../app/roleStore';
import { storeJoinResponse } from '../api/session';
import { syncProgress } from '../api/sync';

type JoinPayload = z.infer<typeof joinPayloadSchema>;

const initialState: JoinPayload = {
  classCode: '',
  studentCode: '',
  displayName: '',
};

export function JoinForm() {
  const [values, setValues] = useState<JoinPayload>(initialState);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setValues((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const parsed = joinPayloadSchema.safeParse(values);
    if (!parsed.success) {
      setError(parsed.error.errors[0]?.message ?? 'Invalid input.');
      return;
    }

    try {
      const response = await apiClient.join(parsed.data);
      storeJoinResponse(response);
      setStoredRole('student');
      void syncProgress('join');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to join right now.';
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
        Student code
        <input
          name="studentCode"
          value={values.studentCode}
          onChange={handleChange}
          placeholder="e.g. S-2049"
          className="rounded-lg border border-slate-700 bg-slate-950 px-4 py-2"
          required
        />
      </label>
      <label className="grid gap-2 text-sm">
        Display name
        <input
          name="displayName"
          value={values.displayName}
          onChange={handleChange}
          placeholder="e.g. Alex Chen"
          className="rounded-lg border border-slate-700 bg-slate-950 px-4 py-2"
          required
        />
      </label>
      {error ? <p className="text-sm text-rose-300">{error}</p> : null}
      <button
        type="submit"
        className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950"
      >
        Join class
      </button>
    </form>
  );
}
