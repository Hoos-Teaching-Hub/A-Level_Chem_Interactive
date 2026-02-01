import { assertEquals, assertThrows } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { parseJoinResponse } from "../testkit/parsing.ts";

Deno.test("parseJoinResponse throws on wrong shape", () => {
  assertThrows(() => parseJoinResponse({}));
});

Deno.test("parseJoinResponse accepts minimal valid payload", () => {
  const x = {
    session_token: "t",
    student_profile: { id: "1", class_code: "c", display_name: "n" },
    progress: [],
  };
  const parsed = parseJoinResponse(x);
  assertEquals(parsed.student_profile.display_name, "n");
});
