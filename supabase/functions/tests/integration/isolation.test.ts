import { assertEquals, assertExists } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { createServiceClient, loadTestConfig } from "../testkit/config.ts";
import { makeActivityId, makeClassCode, makeRateLimitIp, makeStudentCode } from "../testkit/ids.ts";
import { cleanupTestData } from "../testkit/cleanup.ts";
import { createClass, joinSession, loadProgress, saveProgress } from "../testkit/fixtures.ts";

const cfg = loadTestConfig();
const supabase = createServiceClient(cfg);

Deno.test("Sessions cannot read or write another student's progress", async () => {
  const classCode = makeClassCode();
  const firstStudentCode = makeStudentCode();
  const secondStudentCode = makeStudentCode();
  const firstDisplayName = "Isolated Learner A";
  const secondDisplayName = "Isolated Learner B";
  const firstRateLimitIp = makeRateLimitIp();
  const secondRateLimitIp = makeRateLimitIp();
  const sharedActivityId = makeActivityId();
  const studentIds: string[] = [];

  try {
    await createClass(supabase, classCode);

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
      sessionToken: secondJoin.session_token,
      updates: [{ activity_id: sharedActivityId, state: { progress: 0.6 } }],
    });

    const firstLoad = await loadProgress({
      functionsBaseUrl: cfg.functionsBaseUrl,
      sessionToken: firstJoin.session_token,
    });

    const firstActivityIds = firstLoad.progress.map((p) => p.activity_id);
    assertEquals(firstActivityIds.includes(sharedActivityId), false);

    await saveProgress({
      functionsBaseUrl: cfg.functionsBaseUrl,
      sessionToken: firstJoin.session_token,
      updates: [{ activity_id: sharedActivityId, state: { progress: 0.2 } }],
    });

    const secondLoad = await loadProgress({
      functionsBaseUrl: cfg.functionsBaseUrl,
      sessionToken: secondJoin.session_token,
    });

    const secondProgress = secondLoad.progress.find((p) => p.activity_id === sharedActivityId);
    assertExists(secondProgress);
    assertEquals(secondProgress.state, { progress: 0.6 });
  } finally {
    await cleanupTestData({ supabase, classCode, studentIds, rateLimitIp: firstRateLimitIp });
    await supabase.from("rate_limits").delete().eq("ip", secondRateLimitIp);
  }
});
