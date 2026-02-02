import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { hashCode } from "../../_shared/hash.ts";
import { createServiceClient, loadTestConfig } from "../testkit/config.ts";
import { makeActivityId, makeClassCode, makeRateLimitIp, makeStudentCode, makeTeacherCode } from "../testkit/ids.ts";
import { cleanupTestData } from "../testkit/cleanup.ts";
import { createClass, joinSession, saveProgress, teacherReport } from "../testkit/fixtures.ts";
import { fetchDiscard } from "../testkit/http.ts";
import { buildProgressSamples } from "../testkit/sample-progress.ts";

const cfg = loadTestConfig();
const supabase = createServiceClient(cfg);

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
    await createClass(supabase, classCode, teacherCodeHash);

    const firstJoin = await joinSession({
      functionsBaseUrl: cfg.functionsBaseUrl,
      classCode,
      studentCode: firstStudentCode,
      displayName: firstDisplayName,
      rateLimitIp: firstRateLimitIp,
    });

    const secondJoin = await joinSession({
      functionsBaseUrl: cfg.functionsBaseUrl,
      classCode,
      studentCode: secondStudentCode,
      displayName: secondDisplayName,
      rateLimitIp: secondRateLimitIp,
    });

    studentIds.push(firstJoin.student_profile.id, secondJoin.student_profile.id);

    await saveProgress({
      functionsBaseUrl: cfg.functionsBaseUrl,
      sessionToken: firstJoin.session_token,
      updates: [{ activity_id: firstActivityId, state: { progress: 0.4 } }],
    });

    await saveProgress({
      functionsBaseUrl: cfg.functionsBaseUrl,
      sessionToken: secondJoin.session_token,
      updates: [{ activity_id: secondActivityId, state: { progress: 0.9 } }],
    });

    const report = await teacherReport({
      functionsBaseUrl: cfg.functionsBaseUrl,
      classCode,
      teacherCode,
    });

    assertEquals(report?.totals?.students, 2);

    const activityTotals = new Map<string, number>(
      (report.activities ?? []).map((a) => [a.activity_id, a.total]),
    );

    const firstTotal = activityTotals.get(firstActivityId);
    assert(typeof firstTotal === "number" && firstTotal > 0);

    const secondTotal = activityTotals.get(secondActivityId);
    assert(typeof secondTotal === "number" && secondTotal > 0);

    const leaderboardByName = new Map<string, number>(
      (report.leaderboard ?? []).map((e) => [e.display_name, e.completed]),
    );

    assertEquals(leaderboardByName.get(firstDisplayName), 1);
    assertEquals(leaderboardByName.get(secondDisplayName), 1);
  } finally {
    await cleanupTestData({ supabase, classCode, studentIds, rateLimitIp: firstRateLimitIp });
    await supabase.from("rate_limits").delete().eq("ip", secondRateLimitIp);
  }
});

Deno.test("GET /teacher/report aggregates coverage and weak topics", async () => {
  const classCode = makeClassCode();
  const teacherCode = makeTeacherCode();
  const teacherCodeHash = await hashCode(teacherCode, classCode);
  const firstStudentCode = makeStudentCode();
  const secondStudentCode = makeStudentCode();
  const firstRateLimitIp = makeRateLimitIp(110);
  const secondRateLimitIp = makeRateLimitIp(111);
  const studentIds: string[] = [];
  const progressRows = buildProgressSamples();

  try {
    await createClass(supabase, classCode, teacherCodeHash);

    const firstJoin = await joinSession({
      functionsBaseUrl: cfg.functionsBaseUrl,
      classCode,
      studentCode: firstStudentCode,
      displayName: "Coverage Student One",
      rateLimitIp: firstRateLimitIp,
    });

    const secondJoin = await joinSession({
      functionsBaseUrl: cfg.functionsBaseUrl,
      classCode,
      studentCode: secondStudentCode,
      displayName: "Coverage Student Two",
      rateLimitIp: secondRateLimitIp,
    });

    studentIds.push(firstJoin.student_profile.id, secondJoin.student_profile.id);

    // Insert deterministic progress rows directly so aggregation math is stable.
    const insertRows = [
      { ...progressRows[0], student_id: firstJoin.student_profile.id },
      { ...progressRows[1], student_id: firstJoin.student_profile.id },
      { ...progressRows[2], student_id: secondJoin.student_profile.id },
      { ...progressRows[3], student_id: secondJoin.student_profile.id },
    ];

    const { error: progressError } = await supabase.from("progress").insert(insertRows);
    if (progressError) {
      throw new Error(`Failed to seed progress rows: ${progressError.message}`);
    }

    const report = await teacherReport({
      functionsBaseUrl: cfg.functionsBaseUrl,
      classCode,
      teacherCode,
    });

    assertEquals(report.totals?.students, 2);
    assertEquals(report.totals?.coverage, 0.5);
    assertEquals(report.weak_topics, [
      { topic: "Equilibria", average_progress: 0.4, total: 2 },
      { topic: "Kinetics", average_progress: 0.6, total: 2 },
    ]);
  } finally {
    await cleanupTestData({ supabase, classCode, studentIds, rateLimitIp: firstRateLimitIp });
    await supabase.from("rate_limits").delete().eq("ip", secondRateLimitIp);
  }
});

Deno.test("GET /teacher/report returns 403 for invalid teacher code", async () => {
  const classCode = makeClassCode();
  const teacherCode = makeTeacherCode();
  const teacherCodeHash = await hashCode(teacherCode, classCode);
  const rateLimitIp = makeRateLimitIp();

  try {
    await createClass(supabase, classCode, teacherCodeHash);

    await fetchDiscard(
      `${cfg.functionsBaseUrl}/teacher/report?class_code=${encodeURIComponent(classCode)}&teacher_code=invalid-code`,
      { method: "GET" },
      403,
    );
  } finally {
    await cleanupTestData({ supabase, classCode, rateLimitIp });
  }
});
