import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { supabase } from '../_shared/supabase.ts';
import {
  badRequest,
  internalServerError,
  jsonResponse,
  unauthorized,
} from '../_shared/errors.ts';
import { hashToken } from '../_shared/hash.ts';
import {
  getBearerToken,
  handlePreflight,
  validateQuery,
  z,
} from '../_shared/validation.ts';

const LoadQuerySchema = z
  .object({
    since: z.string().datetime().optional(),
  })
  .strict();

serve(async (request) => {
  const preflight = handlePreflight(request);
  if (preflight) {
    return preflight;
  }

  if (request.method !== 'GET') {
    return badRequest('Invalid request method.');
  }

  const token = getBearerToken(request);
  if (!token) {
    return unauthorized('Missing session token.');
  }

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

  const expiresAt = new Date(session.expires_at);
  if (!Number.isNaN(expiresAt.getTime()) && expiresAt < new Date()) {
    return unauthorized('Session token expired.');
  }

  const parsedQuery = validateQuery(request, LoadQuerySchema);
  if (parsedQuery.response) {
    return parsedQuery.response;
  }

  const query = supabase
    .from('progress')
    .select('activity_id, state, updated_at')
    .eq('student_id', session.student_id);

  if (parsedQuery.data.since) {
    query.gt('updated_at', parsedQuery.data.since);
  }

  const { data: progress, error: progressError } = await query;

  if (progressError) {
    return internalServerError('Failed to load progress.');
  }

  return jsonResponse({
    progress: progress ?? [],
  });
});
