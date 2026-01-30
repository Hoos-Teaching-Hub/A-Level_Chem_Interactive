import { useState } from 'react';
import { z } from 'zod';
import { joinPayloadSchema } from '../validators/join';

export type JoinValues = z.infer<typeof joinPayloadSchema>;

const initialState: JoinValues = {
  classCode: '',
  studentCode: '',
  displayName: '',
};

interface StudentJoinFormProps {
  onJoin: (values: JoinValues) => void;
  isLoading: boolean;
  error?: string | null;
}

export function StudentJoinForm({ onJoin, isLoading, error }: StudentJoinFormProps) {
  const [values, setValues] = useState<JoinValues>(initialState);
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setValues((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setValidationError(null);

    const parsed = joinPayloadSchema.safeParse(values);
    if (!parsed.success) {
      setValidationError(parsed.error.errors[0]?.message ?? 'Invalid input.');
      return;
    }

    onJoin(parsed.data);
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
      {validationError ? <p className="text-sm text-rose-300">{validationError}</p> : null}
      {error ? <p className="text-sm text-rose-300">{error}</p> : null}
      <button
        type="submit"
        disabled={isLoading}
        className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-60"
      >
        {isLoading ? 'Joining…' : 'Join class'}
      </button>
    </form>
  );
}
