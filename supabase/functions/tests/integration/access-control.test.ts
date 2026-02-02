import { assertEquals, assertExists } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { hashCode } from "../../_shared/hash.ts";
import { createServiceClient, loadTestConfig } from "../testkit/config.ts";
import { cleanupTestData } from "../testkit/cleanup.ts";
import { createClass, joinSession, loadProgress, saveProgress } from "../testkit/fixtures.ts";
import { fetchDiscard } from "../testkit/http.ts";
import { makeActivityId, makeClassCode, makeRateLimitIp, makeStudentCode, makeTeacherCode } from "../testkit/ids.ts";

const cfg = loadTestConfig();
const supabase = createServiceClient(cfg);

Deno.test("Students cannot read or overwrite another student's progress", async () => {
  const classCode = makeClassCode();
  const studentACode = makeStudentCode();
  const studentBCode = makeStudentCode();
  const studentADisplay = "Permission Student A";
  const studentBDisplay = "Permission Student B";
  const rateLimitIpA = makeRateLimitIp();
  const rateLimitIpB = makeRateLimitIp();
  const sharedActivityId = makeActivityId();
  const studentIds: string[] = [];

  try {
    await createClass(supabase, classCode);

    const studentAJoin = await joinSession({
      functionsBaseUrl: cfg.functionsBaseUrl,
      classCode,
      studentCode: studentACode,
      displayName: studentADisplay,
      rateLimitIp: rateLimitIpA,
    });

    const studentBJoin = await joinSession({
      functionsBaseUrl: cfg.functionsBaseUrl,
      classCode,
      studentCode: studentBCode,
      displayName: studentBDisplay,
      rateLimitIp: rateLimitIpB,
    });

    studentIds.push(studentAJoin.student_profile.id, studentBJoin.student_profile.id);

    await saveProgress({
      functionsBaseUrl: cfg.functionsBaseUrl,
      sessionToken: studentBJoin.session_token,
      updates: [{ activity_id: sharedActivityId, state: { progress: 0.85 } }],
    });

    const studentALoadBefore = await loadProgress({
      functionsBaseUrl: cfg.functionsBaseUrl,
      sessionToken: studentAJoin.session_token,
    });

    const studentABeforeIds = studentALoadBefore.progress.map((row) => row.activity_id);
    assertEquals(studentABeforeIds.includes(sharedActivityId), false);

    await saveProgress({
      functionsBaseUrl: cfg.functionsBaseUrl,
      sessionToken: studentAJoin.session_token,
      updates: [{ activity_id: sharedActivityId, state: { progress: 0.15 } }],
    });

    const studentALoadAfter = await loadProgress({
      functionsBaseUrl: cfg.functionsBaseUrl,
      sessionToken: studentAJoin.session_token,
    });

    const studentAProgress = studentALoadAfter.progress.find(
      (row) => row.activity_id === sharedActivityId,
    );
    assertExists(studentAProgress);
    assertEquals(studentAProgress.state, { progress: 0.15 });

    const studentBLoad = await loadProgress({
      functionsBaseUrl: cfg.functionsBaseUrl,
      sessionToken: studentBJoin.session_token,
    });

    const studentBProgress = studentBLoad.progress.find(
      (row) => row.activity_id === sharedActivityId,
    );
    assertExists(studentBProgress);
    assertEquals(studentBProgress.state, { progress: 0.85 });
  } finally {
    await cleanupTestData({ supabase, classCode, studentIds, rateLimitIp: rateLimitIpA });
    await supabase.from("rate_limits").delete().eq("ip", rateLimitIpB);
  }
});

Deno.test("Student sessions cannot access teacher report endpoints", async () => {
  const classCode = makeClassCode();
  const teacherCode = makeTeacherCode();
  const teacherCodeHash = await hashCode(teacherCode, classCode);
  const studentCode = makeStudentCode();
  const rateLimitIp = makeRateLimitIp();
  let studentId: string | undefined;

  try {
    await createClass(supabase, classCode, teacherCodeHash);

    const join = await joinSession({
      functionsBaseUrl: cfg.functionsBaseUrl,
      classCode,
      studentCode,
      displayName: "Role Gate Student",
      rateLimitIp,
    });

    studentId = join.student_profile.id;

    const reportUrl = `${cfg.functionsBaseUrl}/teacher/report?class_code=${encodeURIComponent(classCode)}&teacher_code=${encodeURIComponent(studentCode)}`;

    await fetchDiscard(reportUrl, {
      method: "GET",
      headers: { authorization: `Bearer ${join.session_token}` },
    }, 403);

    const missingCodeUrl =
      `${cfg.functionsBaseUrl}/teacher/report?class_code=${encodeURIComponent(classCode)}`;

    await fetchDiscard(missingCodeUrl, {
      method: "GET",
      headers: { authorization: `Bearer ${join.session_token}` },
    }, 400);
  } finally {
    await cleanupTestData({ supabase, classCode, studentId, rateLimitIp });
  }
});
