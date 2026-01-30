import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { supabase } from '../_shared/supabase.ts';
import {
  badRequest,
  forbidden,
  internalServerError,
  jsonResponse,
  notFound,
  tooManyRequests,
} from '../_shared/errors.ts';
import {
  generateSessionToken,
  hashCode,
  hashToken,
} from '../_shared/hash.ts';
import { handlePreflight, validateJson, z } from '../_shared/validation.ts';

// Schema for the join request payload. We keep this strict so unexpected
// properties fail fast and the API surface stays predictable for clients.
const JoinSchema = z
  .object({
    class_code: z.string().min(2),
    student_code: z.string().min(2),
    display_name: z.string().min(2).max(80),
  })
  .strict();

// Rate limiting settings are controlled via environment variables so we can
// tune traffic without redeploying code. Defaults are intentionally conservative.
const RATE_LIMIT_WINDOW_SECONDS = Number(
  Deno.env.get('JOIN_RATE_LIMIT_WINDOW_SECONDS') ?? '60',
);
const RATE_LIMIT_MAX = Number(Deno.env.get('JOIN_RATE_LIMIT_MAX') ?? '20');

function resolveClientIp(request: Request): string | null {
  // Prefer the first IP in X-Forwarded-For when behind a proxy, otherwise fall
  // back to X-Real-IP. This matches typical edge gateway behavior.
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    const ip = forwarded.split(',')[0]?.trim();
    if (ip) {
      return ip;
    }
  }

  const realIp = request.headers.get('x-real-ip');
  return realIp?.trim() || null;
}

function resolveSessionExpiry(classExpiresAt: string | null): string {
  // Sessions inherit a TTL, but if the class itself expires sooner we clamp
  // the session expiration to avoid keeping stale access tokens around.
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

async function enforceRateLimit(request: Request): Promise<Response | null> {
  // If limits are disabled or misconfigured, allow the request through.
  if (!Number.isFinite(RATE_LIMIT_WINDOW_SECONDS) || RATE_LIMIT_WINDOW_SECONDS <= 0) {
    return null;
  }

  if (!Number.isFinite(RATE_LIMIT_MAX) || RATE_LIMIT_MAX <= 0) {
    return null;
  }

  const ip = resolveClientIp(request) ?? 'unknown';
  const now = new Date();
  const windowStart = new Date(now.getTime() - RATE_LIMIT_WINDOW_SECONDS * 1000);

  // Track join attempts per IP in a rolling time window.
  const { data: limitRow, error: limitError } = await supabase
    .from('rate_limits')
    .select('ip, window_start, count')
    .eq('ip', ip)
    .maybeSingle();

  if (limitError) {
    return internalServerError('Failed to check rate limit.');
  }

  if (!limitRow) {
    // First request in the window creates the tracker row.
    const { error: insertError } = await supabase.from('rate_limits').insert({
      ip,
      window_start: now.toISOString(),
      count: 1,
    });

    if (insertError) {
      return internalServerError('Failed to update rate limit.');
    }

    return null;
  }

  const existingWindowStart = new Date(limitRow.window_start);
  const withinWindow =
    !Number.isNaN(existingWindowStart.getTime()) &&
    existingWindowStart >= windowStart;

  if (withinWindow) {
    // Still inside the current window: increment count and enforce limit.
    if (limitRow.count + 1 > RATE_LIMIT_MAX) {
      return tooManyRequests('Too many join attempts. Please try again soon.');
    }

    const { error: updateError } = await supabase
      .from('rate_limits')
      .update({ count: limitRow.count + 1, updated_at: now.toISOString() })
      .eq('ip', ip);

    if (updateError) {
      return internalServerError('Failed to update rate limit.');
    }

    return null;
  }

  // Window expired: reset the counter and start a fresh window.
  const { error: resetError } = await supabase
    .from('rate_limits')
    .update({
      count: 1,
      window_start: now.toISOString(),
      updated_at: now.toISOString(),
    })
    .eq('ip', ip);

  if (resetError) {
    return internalServerError('Failed to update rate limit.');
  }

  return null;
}

serve(async (request) => {
  // All edge functions share the same preflight handling to support CORS.
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

  // Throttle by IP to protect the join endpoint from brute force attempts.
  const rateLimitResponse = await enforceRateLimit(request);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  const { class_code, student_code, display_name } = parsed.data;

  // Look up class metadata to ensure the class exists and is still active.
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

  // Student codes are never stored in plaintext; we hash with class code
  // and server salt to prevent cross-class reuse or rainbow table lookups.
  const student_code_hash = await hashCode(student_code, class_code);

  // Upsert keeps a stable student ID if they re-join with the same code.
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

  // Issue a new session token per join request; only the hashed token is stored.
  const session_token = generateSessionToken();
  const token_hash = await hashToken(session_token);
  const expires_at = resolveSessionExpiry(classRow.expires_at ?? null);

  // Store the hashed token alongside its expiry and student linkage.
  const { error: sessionError } = await supabase.from('sessions').insert({
    token_hash,
    student_id: student.id,
    expires_at,
  });

  if (sessionError) {
    return internalServerError('Failed to create session.');
  }

  // Return the student's progress so the client can hydrate immediately.
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
