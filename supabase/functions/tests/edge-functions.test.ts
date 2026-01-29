import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
import {
  assert,
  assertEquals,
  assertExists,
} from 'https://deno.land/std@0.224.0/assert/mod.ts';

type JoinResponse = {
  session_token: string;
  student_profile: {
    id: string;
    class_code: string;
    display_name: string;
  };
  progress: Array<{ activity_id: string; state: Record<string, unknown> }>;
};

const supabaseUrl = Deno.env.get('SUPABASE_URL');
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const functionsBaseUrl = Deno.env.get('SUPABASE_FUNCTIONS_URL') ??
  (supabaseUrl ? `${supabaseUrl}/functions/v1` : undefined);

if (!supabaseUrl || !serviceRoleKey || !functionsBaseUrl) {
  throw new Error(
    'Missing SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, or SUPABASE_FUNCTIONS_URL.',
  );
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function readJson(resp: Response) {
  const raw = await resp.text();
  return raw ? JSON.parse(raw) : null;
}

async function assertStatusAndDrain(resp: Response, expected: number) {
  await resp.text();
  assertEquals(resp.status, expected);
}

async function createClass(classCode: string): Promise<void> {
  const { error } = await supabase.from('classes').insert({
    class_code: classCode,
    name: 'Edge Function Test Class',
    teacher_code_hash: `hash_${crypto.randomUUID()}`,
  });

  if (error) {
    throw new Error(`Failed to insert class: ${error.message}`);
  }
}

async function cleanupTestData(params: {
  classCode: string;
  studentId?: string;
  rateLimitIp: string;
}): Promise<void> {
  const { classCode, studentId, rateLimitIp } = params;

  if (studentId) {
    await supabase.from('progress').delete().eq('student_id', studentId);
    await supabase.from('sessions').delete().eq('student_id', studentId);
    await supabase.from('students').delete().eq('id', studentId);
  }

  await supabase.from('classes').delete().eq('class_code', classCode);
  await supabase.from('rate_limits').delete().eq('ip', rateLimitIp);
}

async function joinSession(params: {
  classCode: string;
  studentCode: string;
  displayName: string;
  rateLimitIp: string;
}): Promise<JoinResponse> {
  const response = await fetch(`${functionsBaseUrl}/join`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-forwarded-for': params.rateLimitIp,
    },
    body: JSON.stringify({
      class_code: params.classCode,
      student_code: params.studentCode,
      display_name: params.displayName,
    }),
  });

  assertEquals(response.status, 200);

  return response.json() as Promise<JoinResponse>;
}

Deno.test('POST /join creates a session', async () => {
  const classCode = `class_${crypto.randomUUID().slice(0, 8)}`;
  const studentCode = `student_${crypto.randomUUID().slice(0, 8)}`;
  const displayName = 'Edge Student';
  const rateLimitIp = `203.0.113.${Math.floor(Math.random() * 200) + 1}`;
  let studentId: string | undefined;

  try {
    await createClass(classCode);

    const payload = await joinSession({
      classCode,
      studentCode,
      displayName,
      rateLimitIp,
    });

    assertExists(payload.session_token);
    assertExists(payload.student_profile);
    assertEquals(payload.student_profile.display_name, displayName);

    studentId = payload.student_profile.id;

    const { data: sessions, error } = await supabase
      .from('sessions')
      .select('student_id')
      .eq('student_id', studentId);

    if (error) {
      throw new Error(`Failed to load sessions: ${error.message}`);
    }

    assertEquals(sessions?.length, 1);
  } finally {
    await cleanupTestData({ classCode, studentId, rateLimitIp });
  }
});

Deno.test('POST /save updates progress and updated_at', async () => {
  const classCode = `class_${crypto.randomUUID().slice(0, 8)}`;
  const studentCode = `student_${crypto.randomUUID().slice(0, 8)}`;
  const displayName = 'Edge Saver';
  const rateLimitIp = `203.0.113.${Math.floor(Math.random() * 200) + 1}`;
  const activityId = `activity_${crypto.randomUUID().slice(0, 8)}`;
  let studentId: string | undefined;

  try {
    await createClass(classCode);

    const joinPayload = await joinSession({
      classCode,
      studentCode,
      displayName,
      rateLimitIp,
    });

    studentId = joinPayload.student_profile.id;

    const saveResponse = await fetch(`${functionsBaseUrl}/save`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${joinPayload.session_token}`,
      },
      body: JSON.stringify({
        updates: [
          {
            activity_id: activityId,
            state: { progress: 0.7 },
          },
        ],
      }),
    });

    assertEquals(saveResponse.status, 200);
    const savePayload = await saveResponse.json();

    assertExists(savePayload.updated_at);
    assertEquals(savePayload.progress?.length, 1);

    const { data: progressRows, error } = await supabase
      .from('progress')
      .select('activity_id, state, updated_at')
      .eq('student_id', studentId)
      .eq('activity_id', activityId)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to load progress: ${error.message}`);
    }

    assertExists(progressRows);
    assertEquals(progressRows.activity_id, activityId);
    assertEquals(progressRows.state, { progress: 0.7 });
    assertEquals(new Date(progressRows.updated_at).getTime(), new Date(savePayload.updated_at).getTime());
  } finally {
    await cleanupTestData({ classCode, studentId, rateLimitIp });
  }
});

Deno.test('GET /load returns progress with optional since filter', async () => {
  const classCode = `class_${crypto.randomUUID().slice(0, 8)}`;
  const studentCode = `student_${crypto.randomUUID().slice(0, 8)}`;
  const displayName = 'Edge Loader';
  const rateLimitIp = `203.0.113.${Math.floor(Math.random() * 200) + 1}`;
  const firstActivityId = `activity_${crypto.randomUUID().slice(0, 8)}`;
  const secondActivityId = `activity_${crypto.randomUUID().slice(0, 8)}`;
  let studentId: string | undefined;

  try {
    await createClass(classCode);

    const joinPayload = await joinSession({
      classCode,
      studentCode,
      displayName,
      rateLimitIp,
    });

    studentId = joinPayload.student_profile.id;

    const firstSaveResponse = await fetch(`${functionsBaseUrl}/save`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${joinPayload.session_token}`,
      },
      body: JSON.stringify({
        updates: [
          {
            activity_id: firstActivityId,
            state: { progress: 0.1 },
          },
        ],
      }),
    });

    assertEquals(firstSaveResponse.status, 200);
    const firstSavePayload = await firstSaveResponse.json();
    assertExists(firstSavePayload.updated_at);

    await new Promise((resolve) => setTimeout(resolve, 10));

    const secondSaveResponse = await fetch(`${functionsBaseUrl}/save`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${joinPayload.session_token}`,
      },
      body: JSON.stringify({
        updates: [
          {
            activity_id: secondActivityId,
            state: { progress: 0.9 },
          },
        ],
      }),
    });

    assertEquals(secondSaveResponse.status, 200);
    const secondSavePayload = await secondSaveResponse.json();
    assertExists(secondSavePayload.updated_at);

    const loadResponse = await fetch(`${functionsBaseUrl}/load`, {
      method: 'GET',
      headers: {
        authorization: `Bearer ${joinPayload.session_token}`,
      },
    });

    assertEquals(loadResponse.status, 200);
    const loadPayload = await readJson(loadResponse);

    const activityIds = loadPayload?.progress.map((item: { activity_id: string }) =>
      item.activity_id
    );
    assertEquals(new Set(activityIds), new Set([firstActivityId, secondActivityId]));

    const sinceResponse = await fetch(
      `${functionsBaseUrl}/load?since=${encodeURIComponent(firstSavePayload.updated_at)}`,
      {
        method: 'GET',
        headers: {
          authorization: `Bearer ${joinPayload.session_token}`,
        },
      },
    );

    assertEquals(sinceResponse.status, 200);
    const sincePayload = await readJson(sinceResponse);
    assertEquals(sincePayload?.progress?.length, 1);
    assertEquals(sincePayload?.progress?.[0]?.activity_id, secondActivityId);

    const missingTokenResponse = await fetch(`${functionsBaseUrl}/load`, {
      method: 'GET',
    });

    await assertStatusAndDrain(missingTokenResponse, 401);

    const invalidTokenResponse = await fetch(`${functionsBaseUrl}/load`, {
      method: 'GET',
      headers: {
        authorization: 'Bearer invalid-token',
      },
    });

    await assertStatusAndDrain(invalidTokenResponse, 401);
  } finally {
    await cleanupTestData({ classCode, studentId, rateLimitIp });
  }
});
