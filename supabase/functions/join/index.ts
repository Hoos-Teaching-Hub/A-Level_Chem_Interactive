import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { supabase } from '../_shared/supabase.ts';
import {
  badRequest,
  forbidden,
  internalServerError,
  jsonResponse,
  notFound,
} from '../_shared/errors.ts';
import {
  generateSessionToken,
  hashCode,
  hashToken,
} from '../_shared/hash.ts';
import { handlePreflight, validateJson, z } from '../_shared/validation.ts';

const JoinSchema = z
  .object({
    class_code: z.string().min(2),
    student_code: z.string().min(2),
    display_name: z.string().min(2).max(80),
  })
  .strict();

function resolveSessionExpiry(classExpiresAt: string | null): string {
  const ttlDays = Number(Deno.env.get('SESSION_TTL_DAYS') ?? '30');
  const ttlMs = Number.isFinite(ttlDays) ? ttlDays * 24 * 60 * 60 * 1000 : 0;
  const sessionExpiry = new Date(Date.now() + ttlMs);

  if (classExpiresAt) {
    const classExpiry = new Date(classExpiresAt);
    if (!Number.isNaN(classExpiry.getTime()) && classExpiry < sessionExpiry) {
      return classExpiry.toISOString();
    }
  }

  return sessionExpiry.toISOString();
}

serve(async (request) => {
  const preflight = handlePreflight(request);
  if (preflight) {
    return preflight;
  }

  if (request.method !== 'POST') {
    return badRequest('Invalid request method.');
  }

  const parsed = await validateJson(request, JoinSchema);
  if (parsed.response) {
    return parsed.response;
  }

  const { class_code, student_code, display_name } = parsed.data;

  const { data: classRow, error: classError } = await supabase
    .from('classes')
    .select('class_code, expires_at')
    .eq('class_code', class_code)
    .maybeSingle();

  if (classError) {
    return internalServerError('Failed to load class.');
  }

  if (!classRow) {
    return notFound('Class code not found.');
  }

  if (classRow.expires_at) {
    const expiresAt = new Date(classRow.expires_at);
    if (!Number.isNaN(expiresAt.getTime()) && expiresAt < new Date()) {
      return forbidden('Class code has expired.');
    }
  }

  const student_code_hash = await hashCode(student_code, class_code);

  const { data: student, error: studentError } = await supabase
    .from('students')
    .upsert(
      {
        class_code,
        student_code_hash,
        display_name,
      },
      { onConflict: 'class_code,student_code_hash' },
    )
    .select('id, class_code, display_name, created_at, last_seen_at')
    .single();

  if (studentError || !student) {
    return internalServerError('Failed to create student session.');
  }

  const session_token = generateSessionToken();
  const token_hash = await hashToken(session_token);
  const expires_at = resolveSessionExpiry(classRow.expires_at ?? null);

  const { error: sessionError } = await supabase.from('sessions').insert({
    token_hash,
    student_id: student.id,
    expires_at,
  });

  if (sessionError) {
    return internalServerError('Failed to create session.');
  }

  const { data: progress, error: progressError } = await supabase
    .from('progress')
    .select('activity_id, state, updated_at')
    .eq('student_id', student.id);

  if (progressError) {
    return internalServerError('Failed to load progress.');
  }

  return jsonResponse({
    session_token,
    student_profile: student,
    progress: progress ?? [],
  });
});
