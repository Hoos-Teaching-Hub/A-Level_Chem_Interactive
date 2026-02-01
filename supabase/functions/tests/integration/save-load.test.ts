import { assertEquals, assertExists } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { createServiceClient, loadTestConfig } from "../testkit/config.ts";
import { makeActivityId, makeClassCode, makeRateLimitIp, makeStudentCode } from "../testkit/ids.ts";
import { cleanupTestData } from "../testkit/cleanup.ts";
import { createClass, joinSession, loadProgress, saveProgress, discardLoadUnauthorized } from "../testkit/fixtures.ts";
import { fetchErrorJson, fetchDiscard } from "../testkit/http.ts";
import { parseErrorPayload } from "../testkit/parsing.ts";
import { retry } from "../testkit/retry.ts";

const cfg = loadTestConfig();
const supabase = createServiceClient(cfg);

Deno.test("POST /save updates progress and updated_at", async () => {
  const classCode = makeClassCode();
  const studentCode = makeStudentCode();
  const displayName = "Edge Saver";
  const rateLimitIp = makeRateLimitIp();
  const activityId = makeActivityId();
  let studentId: string | undefined;

  try {
    await createClass(supabase, classCode);

    const joinPayload = await joinSession({
      functionsBaseUrl: cfg.functionsBaseUrl,
      classCode,
      studentCode,
      displayName,
      rateLimitIp,
    });

    studentId = joinPayload.student_profile.id;

    const savePayload = await saveProgress({
      functionsBaseUrl: cfg.functionsBaseUrl,
      sessionToken: joinPayload.session_token,
      updates: [{ activity_id: activityId, state: { progress: 0.7 } }],
    });

    assertExists(savePayload.updated_at);
    assertEquals(savePayload.progress.length, 1);

    const progressRows = await retry(async () => {
      const { data, error } = await supabase
        .from("progress")
        .select("activity_id, state, updated_at")
        .eq("student_id", studentId)
        .eq("activity_id", activityId)
        .maybeSingle();

      if (error) throw new Error(`Failed to load progress: ${error.message}`);
      if (!data) throw new Error("Progress row not visible yet.");
      return data;
    }, { attempts: 5, delayMs: 25 });

    assertEquals(progressRows.activity_id, activityId);
    assertEquals(progressRows.state, { progress: 0.7 });

    assertEquals(
      new Date(progressRows.updated_at).getTime(),
      new Date(savePayload.updated_at).getTime(),
    );
  } finally {
    await cleanupTestData({ supabase, classCode, studentId, rateLimitIp });
  }
});

Deno.test("POST /save rejects malformed or missing updates", async () => {
  const classCode = makeClassCode();
  const studentCode = makeStudentCode();
  const displayName = "Edge Invalid Saver";
  const rateLimitIp = makeRateLimitIp();
  let studentId: string | undefined;

  try {
    await createClass(supabase, classCode);

    const joinPayload = await joinSession({
      functionsBaseUrl: cfg.functionsBaseUrl,
      classCode,
      studentCode,
      displayName,
      rateLimitIp,
    });

    studentId = joinPayload.student_profile.id;

    const missingUpdatesRaw = await fetchErrorJson(
      `${cfg.functionsBaseUrl}/save`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${joinPayload.session_token}`,
        },
        body: JSON.stringify({}),
      },
      400,
    );

    const missingUpdatesPayload = parseErrorPayload(missingUpdatesRaw);
    assertEquals(missingUpdatesPayload?.error?.code, "bad_request");
    assertEquals(missingUpdatesPayload?.error?.message, "Validation failed.");

    const emptyUpdatesRaw = await fetchErrorJson(
      `${cfg.functionsBaseUrl}/save`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${joinPayload.session_token}`,
        },
        body: JSON.stringify({ updates: [] }),
      },
      400,
    );

    const emptyUpdatesPayload = parseErrorPayload(emptyUpdatesRaw);
    assertEquals(emptyUpdatesPayload?.error?.code, "bad_request");
    assertEquals(emptyUpdatesPayload?.error?.message, "Validation failed.");
  } finally {
    await cleanupTestData({ supabase, classCode, studentId, rateLimitIp });
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
    await createClass(supabase, classCode);

    const joinPayload = await joinSession({
      functionsBaseUrl: cfg.functionsBaseUrl,
      classCode,
      studentCode,
      displayName,
      rateLimitIp,
    });

    studentId = joinPayload.student_profile.id;

    const firstSave = await saveProgress({
      functionsBaseUrl: cfg.functionsBaseUrl,
      sessionToken: joinPayload.session_token,
      updates: [{ activity_id: firstActivityId, state: { progress: 0.1 } }],
    });

    const secondSave = await retry(async () => {
      const s = await saveProgress({
        functionsBaseUrl: cfg.functionsBaseUrl,
        sessionToken: joinPayload.session_token,
        updates: [{ activity_id: secondActivityId, state: { progress: 0.9 } }],
      });

      if (new Date(s.updated_at).getTime() <= new Date(firstSave.updated_at).getTime()) {
        throw new Error("updated_at did not advance yet.");
      }
      return s;
    }, { attempts: 6, delayMs: 20 });

    assertExists(secondSave.updated_at);

    const loadAll = await loadProgress({
      functionsBaseUrl: cfg.functionsBaseUrl,
      sessionToken: joinPayload.session_token,
    });

    const activityIds = loadAll.progress.map((p) => p.activity_id);
    assertEquals(new Set(activityIds), new Set([firstActivityId, secondActivityId]));

    const since = await loadProgress({
      functionsBaseUrl: cfg.functionsBaseUrl,
      sessionToken: joinPayload.session_token,
      since: firstSave.updated_at,
    });

    assertEquals(since.progress.length, 1);
    assertEquals(since.progress[0].activity_id, secondActivityId);

    await discardLoadUnauthorized(cfg.functionsBaseUrl);
  } finally {
    await cleanupTestData({ supabase, classCode, studentId, rateLimitIp });
  }
});

Deno.test("GET /load rejects malformed query values", async () => {
  const classCode = makeClassCode();
  const studentCode = makeStudentCode();
  const displayName = "Edge Invalid Loader";
  const rateLimitIp = makeRateLimitIp();
  let studentId: string | undefined;

  try {
    await createClass(supabase, classCode);

    const joinPayload = await joinSession({
      functionsBaseUrl: cfg.functionsBaseUrl,
      classCode,
      studentCode,
      displayName,
      rateLimitIp,
    });

    studentId = joinPayload.student_profile.id;

    const invalidSinceRaw = await fetchErrorJson(
      `${cfg.functionsBaseUrl}/load?since=not-a-date`,
      {
        method: "GET",
        headers: { authorization: `Bearer ${joinPayload.session_token}` },
      },
      400,
    );

    const invalidSincePayload = parseErrorPayload(invalidSinceRaw);
    assertEquals(invalidSincePayload?.error?.code, "bad_request");
    assertEquals(invalidSincePayload?.error?.message, "Validation failed.");

    const emptySinceRaw = await fetchErrorJson(
      `${cfg.functionsBaseUrl}/load?since=`,
      {
        method: "GET",
        headers: { authorization: `Bearer ${joinPayload.session_token}` },
      },
      400,
    );

    const emptySincePayload = parseErrorPayload(emptySinceRaw);
    assertEquals(emptySincePayload?.error?.code, "bad_request");
    assertEquals(emptySincePayload?.error?.message, "Validation failed.");

    await fetchDiscard(`${cfg.functionsBaseUrl}/load`, { method: "GET" }, 401);
  } finally {
    await cleanupTestData({ supabase, classCode, studentId, rateLimitIp });
  }
});
