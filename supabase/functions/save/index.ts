import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { supabase } from '../_shared/supabase.ts';
import {
  badRequest,
  internalServerError,
  jsonResponse,
  unauthorized,
} from '../_shared/errors.ts';
import { hashToken } from '../_shared/hash.ts';
import { getBearerToken, handlePreflight, validateJson, z } from '../_shared/validation.ts';

// Schema for progress updates. We accept a batch so clients can sync multiple
// activities in one request, reducing round-trips.
const SaveSchema = z
  .object({
    updates: z
      .array(
        z
          .object({
            activity_id: z.string().min(1),
            state: z.record(z.unknown()),
          })
          .strict(),
      )
      .min(1),
  })
  .strict();

serve(async (request) => {
  // CORS preflight handling shared across edge functions.
  const preflight = handlePreflight(request);
  if (preflight) {
    return preflight;
  }

  if (request.method !== 'POST') {
    return badRequest('Invalid request method.');
  }

  // Sessions are authenticated via a bearer token issued by the join endpoint.
  const token = getBearerToken(request);
  if (!token) {
    return unauthorized('Missing session token.');
  }

  const parsed = await validateJson(request, SaveSchema);
  if (parsed.response) {
    return parsed.response;
  }

  // Only hashed tokens are stored in the database; compare hashes for security.
  const token_hash = await hashToken(token);

  const { data: session, error: sessionError } = await supabase
    .from('sessions')
    .select('token_hash, student_id, expires_at')
    .eq('token_hash', token_hash)
    .maybeSingle();

  if (sessionError) {
    return internalServerError('Failed to validate session.');
  }

  if (!session) {
    return unauthorized('Invalid session token.');
  }

  // Enforce session expiry on every write to prevent stale tokens from updating state.
  const expiresAt = new Date(session.expires_at);
  if (!Number.isNaN(expiresAt.getTime()) && expiresAt < new Date()) {
    return unauthorized('Session token expired.');
  }

  // Normalize timestamps so all updates in the batch share a consistent `updated_at`.
  const now = new Date().toISOString();
  const records = parsed.data.updates.map((update) => ({
    student_id: session.student_id,
    activity_id: update.activity_id,
    state: update.state,
    updated_at: now,
  }));

  // Upsert keeps the latest state for each activity while allowing first-time inserts.
  const { data: progressRows, error: progressError } = await supabase
    .from('progress')
    .upsert(records, { onConflict: 'student_id,activity_id' })
    .select('activity_id, updated_at');

  if (progressError) {
    return internalServerError('Failed to save progress.');
  }

  // Update activity timestamps for both the session and the student profile.
  const { error: sessionUpdateError } = await supabase
    .from('sessions')
    .update({ last_seen_at: now })
    .eq('token_hash', token_hash);

  if (sessionUpdateError) {
    return internalServerError('Failed to update session.');
  }

  const { error: studentUpdateError } = await supabase
    .from('students')
    .update({ last_seen_at: now })
    .eq('id', session.student_id);

  if (studentUpdateError) {
    return internalServerError('Failed to update student.');
  }

  // Return updated timestamps so clients can store a consistent sync marker.
  return jsonResponse({
    updated_at: now,
    progress: progressRows ?? [],
  });
});
