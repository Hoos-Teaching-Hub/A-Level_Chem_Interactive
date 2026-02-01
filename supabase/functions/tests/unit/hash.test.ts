import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { hashCode } from "../../_shared/hash.ts";

Deno.test("hashCode is deterministic for same inputs", async () => {
  const a = await hashCode("teacher_123", "class_abc");
  const b = await hashCode("teacher_123", "class_abc");
  assertEquals(a, b);
});
