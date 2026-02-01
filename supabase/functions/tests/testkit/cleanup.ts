import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

export async function cleanupTestData(params: {
  supabase: SupabaseClient;
  classCode: string;
  studentId?: string;
  studentIds?: string[];
  rateLimitIp: string;
}): Promise<void> {
  const { supabase, classCode, studentId, studentIds, rateLimitIp } = params;

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
