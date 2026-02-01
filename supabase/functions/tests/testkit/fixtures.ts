import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { fetchJson, fetchDiscard } from "./http.ts";
import {
  parseJoinResponse,
  parseLoadResponse,
  parseSaveResponse,
  type JoinResponse,
  type LoadResponse,
  type SaveResponse,
  type TeacherReportResponse,
  parseTeacherReportResponse,
} from "./parsing.ts";

export async function createClass(
  supabase: SupabaseClient,
  classCode: string,
  teacherCodeHash = `hash_${crypto.randomUUID()}`,
): Promise<void> {
  const { error } = await supabase.from("classes").insert({
    class_code: classCode,
    name: "Edge Function Test Class",
    teacher_code_hash: teacherCodeHash,
  });

  if (error) throw new Error(`Failed to insert class: ${error.message}`);
}

export async function joinSession(params: {
  functionsBaseUrl: string;
  classCode: string;
  studentCode: string;
  displayName: string;
  rateLimitIp: string;
}): Promise<JoinResponse> {
  const raw = await fetchJson(`${params.functionsBaseUrl}/join`, {
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

  return parseJoinResponse(raw);
}

export async function saveProgress(params: {
  functionsBaseUrl: string;
  sessionToken: string;
  updates: Array<{ activity_id: string; state: Record<string, unknown> }>;
}): Promise<SaveResponse> {
  const raw = await fetchJson(`${params.functionsBaseUrl}/save`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${params.sessionToken}`,
    },
    body: JSON.stringify({ updates: params.updates }),
  }, 200);

  return parseSaveResponse(raw);
}

export async function loadProgress(params: {
  functionsBaseUrl: string;
  sessionToken: string;
  since?: string;
}): Promise<LoadResponse> {
  const url = params.since
    ? `${params.functionsBaseUrl}/load?since=${encodeURIComponent(params.since)}`
    : `${params.functionsBaseUrl}/load`;

  const raw = await fetchJson(url, {
    method: "GET",
    headers: { authorization: `Bearer ${params.sessionToken}` },
  }, 200);

  return parseLoadResponse(raw);
}

export async function discardLoadUnauthorized(functionsBaseUrl: string): Promise<void> {
  await fetchDiscard(`${functionsBaseUrl}/load`, { method: "GET" }, 401);
  await fetchDiscard(`${functionsBaseUrl}/load`, {
    method: "GET",
    headers: { authorization: "Bearer invalid-token" },
  }, 401);
}

export async function teacherReport(params: {
  functionsBaseUrl: string;
  classCode: string;
  teacherCode: string;
}): Promise<TeacherReportResponse> {
  const url =
    `${params.functionsBaseUrl}/teacher/report?class_code=${encodeURIComponent(params.classCode)}&teacher_code=${encodeURIComponent(params.teacherCode)}`;

  const raw = await fetchJson(url, { method: "GET" }, 200);
  return parseTeacherReportResponse(raw);
}
