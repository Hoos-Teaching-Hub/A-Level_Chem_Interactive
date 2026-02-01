import { assertEquals, assertExists } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { createServiceClient, loadTestConfig } from "../testkit/config.ts";
import { makeClassCode, makeRateLimitIp, makeStudentCode } from "../testkit/ids.ts";
import { cleanupTestData } from "../testkit/cleanup.ts";
import { createClass, joinSession } from "../testkit/fixtures.ts";
import { fetchErrorJson } from "../testkit/http.ts";
import { parseErrorPayload } from "../testkit/parsing.ts";

const cfg = loadTestConfig();
const supabase = createServiceClient(cfg);

Deno.test("POST /join creates a session", async () => {
  const classCode = makeClassCode();
  const studentCode = makeStudentCode();
  const displayName = "Edge Student";
  const rateLimitIp = makeRateLimitIp();
  let studentId: string | undefined;

  try {
    await createClass(supabase, classCode);

    const payload = await joinSession({
      functionsBaseUrl: cfg.functionsBaseUrl,
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

    if (error) throw new Error(`Failed to load sessions: ${error.message}`);
    assertEquals(sessions?.length, 1);
  } finally {
    await cleanupTestData({ supabase, classCode, studentId, rateLimitIp });
  }
});

Deno.test("POST /join rejects malformed or missing fields", async () => {
  const rateLimitIp = makeRateLimitIp();

  const missingFieldRaw = await fetchErrorJson(
    `${cfg.functionsBaseUrl}/join`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-forwarded-for": rateLimitIp,
      },
      body: JSON.stringify({ class_code: "ab", student_code: "cd" }),
    },
    400,
  );

  const missingFieldPayload = parseErrorPayload(missingFieldRaw);
  assertEquals(missingFieldPayload?.error?.code, "bad_request");
  assertEquals(missingFieldPayload?.error?.message, "Validation failed.");

  const invalidJsonRaw = await fetchErrorJson(
    `${cfg.functionsBaseUrl}/join`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-forwarded-for": rateLimitIp,
      },
      body: "{",
    },
    400,
  );

  const invalidJsonPayload = parseErrorPayload(invalidJsonRaw);
  assertEquals(invalidJsonPayload?.error?.code, "bad_request");
  assertEquals(invalidJsonPayload?.error?.message, "Invalid JSON body.");
});
