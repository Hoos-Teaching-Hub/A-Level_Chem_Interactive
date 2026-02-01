function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null;
}

function getRecord(x: unknown, label: string): Record<string, unknown> {
  if (!isRecord(x)) throw new Error(`Expected object for ${label}`);
  return x;
}

function getString(obj: Record<string, unknown>, key: string): string {
  const v = obj[key];
  if (typeof v !== "string") throw new Error(`Expected string at ${key}`);
  return v;
}

export type JoinResponse = {
  session_token: string;
  student_profile: {
    id: string;
    class_code: string;
    display_name: string;
  };
  progress: Array<{ activity_id: string; state: Record<string, unknown> }>;
};

export function parseJoinResponse(x: unknown): JoinResponse {
  const root = getRecord(x, "join response");

  const session_token = getString(root, "session_token");

  const sp = getRecord(root.student_profile, "student_profile");
  const student_profile = {
    id: getString(sp, "id"),
    class_code: getString(sp, "class_code"),
    display_name: getString(sp, "display_name"),
  };

  const progressRaw = Array.isArray(root.progress) ? root.progress : [];
  const progress = progressRaw.map((p, idx) => {
    const pr = getRecord(p, `progress[${idx}]`);
    const activity_id = getString(pr, "activity_id");
    const state = getRecord(pr.state, `progress[${idx}].state`);
    return { activity_id, state };
  });

  return { session_token, student_profile, progress };
}

export type SaveResponse = {
  updated_at: string;
  progress: Array<{ activity_id: string; state: Record<string, unknown> }>;
};

export function parseSaveResponse(x: unknown): SaveResponse {
  const root = getRecord(x, "save response");
  const updated_at = getString(root, "updated_at");

  const progressRaw = Array.isArray(root.progress) ? root.progress : [];
  const progress = progressRaw.map((p, idx) => {
    const pr = getRecord(p, `progress[${idx}]`);
    const activity_id = getString(pr, "activity_id");
    const state = getRecord(pr.state, `progress[${idx}].state`);
    return { activity_id, state };
  });

  return { updated_at, progress };
}

export type LoadResponse = {
  progress: Array<{ activity_id: string; state: Record<string, unknown> }>;
};

export function parseLoadResponse(x: unknown): LoadResponse {
  const root = getRecord(x, "load response");
  const progressRaw = Array.isArray(root.progress) ? root.progress : [];
  const progress = progressRaw.map((p, idx) => {
    const pr = getRecord(p, `progress[${idx}]`);
    const activity_id = getString(pr, "activity_id");
    const state = getRecord(pr.state, `progress[${idx}].state`);
    return { activity_id, state };
  });
  return { progress };
}

export type ErrorPayload = {
  error?: { code?: string; message?: string };
};

export function parseErrorPayload(x: unknown): ErrorPayload {
  const root = isRecord(x) ? x : {};
  const err = isRecord(root.error) ? root.error : {};
  return {
    error: {
      code: typeof err.code === "string" ? err.code : undefined,
      message: typeof err.message === "string" ? err.message : undefined,
    },
  };
}

export type TeacherReportResponse = {
  totals?: { students?: number };
  activities?: Array<{ activity_id: string; total: number }>;
  leaderboard?: Array<{ display_name: string; completed: number }>;
};

export function parseTeacherReportResponse(x: unknown): TeacherReportResponse {
  const root = getRecord(x, "teacher report response");

  const totalsObj = isRecord(root.totals) ? root.totals : undefined;
  const totals = totalsObj
    ? { students: typeof totalsObj.students === "number" ? totalsObj.students : undefined }
    : undefined;

  const activitiesRaw = Array.isArray(root.activities) ? root.activities : [];
  const activities = activitiesRaw.map((a, idx) => {
    const ar = getRecord(a, `activities[${idx}]`);
    const activity_id = getString(ar, "activity_id");
    const total = ar.total;
    if (typeof total !== "number") throw new Error(`Expected number at activities[${idx}].total`);
    return { activity_id, total };
  });

  const leaderboardRaw = Array.isArray(root.leaderboard) ? root.leaderboard : [];
  const leaderboard = leaderboardRaw.map((e, idx) => {
    const er = getRecord(e, `leaderboard[${idx}]`);
    const display_name = getString(er, "display_name");
    const completed = er.completed;
    if (typeof completed !== "number") {
      throw new Error(`Expected number at leaderboard[${idx}].completed`);
    }
    return { display_name, completed };
  });

  return { totals, activities, leaderboard };
}
