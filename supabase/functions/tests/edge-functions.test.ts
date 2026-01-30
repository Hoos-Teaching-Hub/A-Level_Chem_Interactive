import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import {
  assert,
  assertEquals,
  assertExists,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import { hashCode } from "../_shared/hash.ts";

type JoinResponse = {
  session_token: string;
  student_profile: {
    id: string;
    class_code: string;
    display_name: string;
  };
  progress: Array<{ activity_id: string; state: Record<string, unknown> }>;
};

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const functionsBaseUrl =
  Deno.env.get("SUPABASE_FUNCTIONS_URL") ??
  (supabaseUrl ? `${supabaseUrl}/functions/v1` : undefined);

if (!supabaseUrl || !serviceRoleKey || !functionsBaseUrl) {
  throw new Error(
    "Missing SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, or SUPABASE_FUNCTIONS_URL.",
  );
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const randomSuffix = () => crypto.randomUUID().slice(0, 8);
const makeClassCode = () => `class_${randomSuffix()}`;
const makeStudentCode = () => `student_${randomSuffix()}`;
const makeTeacherCode = () => `teach_${randomSuffix()}`;
const makeActivityId = () => `activity_${randomSuffix()}`;
const makeRateLimitIp = (octet = Math.floor(Math.random() * 200) + 1) =>
  `203.0.113.${octet}`;

async function sleep(ms: number): Promise<void> {
  return await new Promise((resolve) => setTimeout(resolve, ms));
}

async function readJson(resp: Response) {
  // Always consume the response body exactly once.
  const raw = await resp.text();
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error(`Failed to parse JSON. Body: ${raw}`);
  }
}

async function expectStatus(resp: Response, expected: number): Promise<void> {
  if (resp.status !== expected) {
    // Drain body on failure to avoid leaks and include it in error for debugging.
    const body = await resp.text();
    throw new Error(`Expected ${expected}, got ${resp.status}. Body: ${body}`);
  }
}

async function discardBody(resp: Response): Promise<void> {
  // Cancel the body stream when we don't need it to avoid leak warnings.
  try {
    await resp.body?.cancel();
  } catch {
    // Ignore if already consumed/locked.
  }
}

async function fetchJson<T>(
  url: string,
  init: RequestInit,
  expected = 200,
): Promise<T> {
  const resp = await fetch(url, init);
  await expectStatus(resp, expected);
  return (await readJson(resp)) as T;
}

async function fetchDiscard(
  url: string,
  init: RequestInit,
  expected = 200,
): Promise<void> {
  const resp = await fetch(url, init);
  if (resp.status !== expected) {
    const body = await resp.text(); // drains on failure
    throw new Error(`Expected ${expected}, got ${resp.status}. Body: ${body}`);
  }
  await discardBody(resp);
}

async function createClass(
  classCode: string,
  teacherCodeHash = `hash_${crypto.randomUUID()}`,
): Promise<void> {
  const { error } = await supabase.from("classes").insert({
    class_code: classCode,
    name: "Edge Function Test Class",
    teacher_code_hash: teacherCodeHash,
  });

  if (error) {
    throw new Error(`Failed to insert class: ${error.message}`);
  }
}

async function cleanupTestData(params: {
  classCode: string;
  studentId?: string;
  studentIds?: string[];
  rateLimitIp: string;
}): Promise<void> {
  const { classCode, studentId, studentIds, rateLimitIp } = params;

  // Cleaning in dependency order prevents foreign key errors when rows exist.
  const idsToCleanup = [studentId, ...(studentIds ?? [])].filter(
    (id): id is string => Boolean(id),
  );

  for (const id of idsToCleanup) {
    await supabase.from("progress").delete().eq("student_id", id);
    await supabase.from("sessions").delete().eq("student_id", id);
    await supabase.from("students").delete().eq("id", id);
  }

  await supabase.from("classes").delete().eq("class_code", classCode);
  await supabase.from("rate_limits").delete().eq("ip", rateLimitIp);
}

async function joinSession(params: {
  classCode: string;
  studentCode: string;
  displayName: string;
  rateLimitIp: string;
}): Promise<JoinResponse> {
  return await fetchJson<JoinResponse>(`${functionsBaseUrl}/join`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-forwarded-for": params.rateLimitIp,
    },
    body: JSON.stringify({
      class_code: params.classCode,
      student_code: params.studentCode,
      display_name: params.displayName,
    }),
  }, 200);
}

Deno.test("POST /join creates a session", async () => {
  const classCode = makeClassCode();
  const studentCode = makeStudentCode();
  const displayName = "Edge Student";
  const rateLimitIp = makeRateLimitIp();
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
      .from("sessions")
      .select("student_id")
      .eq("student_id", studentId);

    if (error) {
      throw new Error(`Failed to load sessions: ${error.message}`);
    }

    assertEquals(sessions?.length, 1);
  } finally {
    await cleanupTestData({ classCode, studentId, rateLimitIp });
  }
});

Deno.test("POST /save updates progress and updated_at", async () => {
  const classCode = makeClassCode();
  const studentCode = makeStudentCode();
  const displayName = "Edge Saver";
  const rateLimitIp = makeRateLimitIp();
  const activityId = makeActivityId();
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

    const savePayload = await fetchJson<any>(`${functionsBaseUrl}/save`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
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
    }, 200);

    assertExists(savePayload.updated_at);
    assertEquals(savePayload.progress?.length, 1);

    const { data: progressRows, error } = await supabase
      .from("progress")
      .select("activity_id, state, updated_at")
      .eq("student_id", studentId)
      .eq("activity_id", activityId)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to load progress: ${error.message}`);
    }

    assertExists(progressRows);
    assertEquals(progressRows.activity_id, activityId);
    assertEquals(progressRows.state, { progress: 0.7 });

    // Compare timestamps by instant, not by string formatting.
    assertEquals(
      new Date(progressRows.updated_at).getTime(),
      new Date(savePayload.updated_at).getTime(),
    );
  } finally {
    await cleanupTestData({ classCode, studentId, rateLimitIp });
  }
});

Deno.test("GET /load returns progress with optional since filter", async () => {
  const classCode = makeClassCode();
  const studentCode = makeStudentCode();
  const displayName = "Edge Loader";
  const rateLimitIp = makeRateLimitIp();
  const firstActivityId = makeActivityId();
  const secondActivityId = makeActivityId();
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

    const firstSavePayload = await fetchJson<any>(`${functionsBaseUrl}/save`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
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
    }, 200);
    assertExists(firstSavePayload.updated_at);

    await sleep(10);

    const secondSavePayload = await fetchJson<any>(`${functionsBaseUrl}/save`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
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
    }, 200);
    assertExists(secondSavePayload.updated_at);

    const loadPayload = await fetchJson<any>(`${functionsBaseUrl}/load`, {
      method: "GET",
      headers: {
        authorization: `Bearer ${joinPayload.session_token}`,
      },
    }, 200);

    const activityIds = (loadPayload?.progress ?? []).map(
      (item: { activity_id: string }) => item.activity_id,
    );
    assertEquals(new Set(activityIds), new Set([firstActivityId, secondActivityId]));

    const sincePayload = await fetchJson<any>(
      `${functionsBaseUrl}/load?since=${encodeURIComponent(firstSavePayload.updated_at)}`,
      {
        method: "GET",
        headers: {
          authorization: `Bearer ${joinPayload.session_token}`,
        },
      },
      200,
    );

    assertEquals(sincePayload?.progress?.length, 1);
    assertEquals(sincePayload?.progress?.[0]?.activity_id, secondActivityId);

    await fetchDiscard(`${functionsBaseUrl}/load`, { method: "GET" }, 401);

    await fetchDiscard(`${functionsBaseUrl}/load`, {
      method: "GET",
      headers: {
        authorization: "Bearer invalid-token",
      },
    }, 401);
  } finally {
    await cleanupTestData({ classCode, studentId, rateLimitIp });
  }
});

Deno.test("GET /teacher/report returns aggregates with valid teacher code", async () => {
  const classCode = makeClassCode();
  const teacherCode = makeTeacherCode();
  const teacherCodeHash = await hashCode(teacherCode, classCode);
  const firstStudentCode = makeStudentCode();
  const secondStudentCode = makeStudentCode();
  const firstDisplayName = "Edge Learner One";
  const secondDisplayName = "Edge Learner Two";
  const firstRateLimitIp = makeRateLimitIp();
  const secondRateLimitIp = `198.51.100.${Math.floor(Math.random() * 200) + 1}`;
  const firstActivityId = makeActivityId();
  const secondActivityId = makeActivityId();
  const studentIds: string[] = [];

  try {
    await createClass(classCode, teacherCodeHash);

    const firstJoin = await joinSession({
      classCode,
      studentCode: firstStudentCode,
      displayName: firstDisplayName,
      rateLimitIp: firstRateLimitIp,
    });
    const secondJoin = await joinSession({
      classCode,
      studentCode: secondStudentCode,
      displayName: secondDisplayName,
      rateLimitIp: secondRateLimitIp,
    });

    studentIds.push(firstJoin.student_profile.id, secondJoin.student_profile.id);

    await fetchDiscard(`${functionsBaseUrl}/save`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${firstJoin.session_token}`,
      },
      body: JSON.stringify({
        updates: [
          {
            activity_id: firstActivityId,
            state: { progress: 0.4 },
          },
        ],
      }),
    }, 200);

    await fetchDiscard(`${functionsBaseUrl}/save`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${secondJoin.session_token}`,
      },
      body: JSON.stringify({
        updates: [
          {
            activity_id: secondActivityId,
            state: { progress: 0.9 },
          },
        ],
      }),
    }, 200);

    const reportPayload = await fetchJson<any>(
      `${functionsBaseUrl}/teacher/report?class_code=${encodeURIComponent(classCode)}&teacher_code=${encodeURIComponent(teacherCode)}`,
      { method: "GET" },
      200,
    );

    assertEquals(reportPayload?.totals?.students, 2);

    const activityTotals = new Map(
      (reportPayload?.activities ?? []).map(
        (activity: { activity_id: string; total: number }) => [
          activity.activity_id,
          activity.total,
        ],
      ),
    );

    assertEquals(activityTotals.has(firstActivityId), true);
    assertEquals(activityTotals.has(secondActivityId), true);

    const firstTotal = activityTotals.get(firstActivityId);
    assert(typeof firstTotal === "number" && firstTotal > 0);

    const secondTotal = activityTotals.get(secondActivityId);
    assert(typeof secondTotal === "number" && secondTotal > 0);

    const leaderboardEntries = reportPayload?.leaderboard ?? [];
    const leaderboardByName = new Map(
      leaderboardEntries.map(
        (entry: { display_name: string; completed: number }) => [
          entry.display_name,
          entry.completed,
        ],
      ),
    );

    assertEquals(leaderboardByName.get(firstDisplayName), 1);
    assertEquals(leaderboardByName.get(secondDisplayName), 1);
  } finally {
    await cleanupTestData({
      classCode,
      studentIds,
      rateLimitIp: firstRateLimitIp,
    });
    await supabase.from("rate_limits").delete().eq("ip", secondRateLimitIp);
  }
});

Deno.test("GET /teacher/report returns 403 for invalid teacher code", async () => {
  const classCode = makeClassCode();
  const teacherCode = makeTeacherCode();
  const teacherCodeHash = await hashCode(teacherCode, classCode);
  const rateLimitIp = makeRateLimitIp();

  try {
    await createClass(classCode, teacherCodeHash);

    await fetchDiscard(
      `${functionsBaseUrl}/teacher/report?class_code=${encodeURIComponent(classCode)}&teacher_code=invalid-code`,
      { method: "GET" },
      403,
    );
  } finally {
    await cleanupTestData({ classCode, rateLimitIp });
  }
});
