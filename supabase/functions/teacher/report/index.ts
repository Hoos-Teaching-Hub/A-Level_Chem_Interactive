import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { supabase } from '../../_shared/supabase.ts';
import {
  badRequest,
  forbidden,
  internalServerError,
  jsonResponse,
  notFound,
} from '../../_shared/errors.ts';
import { hashCode } from '../../_shared/hash.ts';
import {
  handlePreflight,
  validateQuery,
  z,
} from '../../_shared/validation.ts';

const ReportQuerySchema = z
  .object({
    class_code: z.string().min(2),
    teacher_code: z.string().min(2).optional(),
    teacher_code_hash: z.string().min(10).optional(),
  })
  .strict();

function formatDateBucket(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'unknown';
  }
  return date.toISOString().slice(0, 10);
}

serve(async (request) => {
  const preflight = handlePreflight(request);
  if (preflight) {
    return preflight;
  }

  if (request.method !== 'GET') {
    return badRequest('Invalid request method.');
  }

  const parsedQuery = validateQuery(request, ReportQuerySchema);
  if (parsedQuery.response) {
    return parsedQuery.response;
  }

  const { class_code } = parsedQuery.data;
  const teacherCodeFromQuery = parsedQuery.data.teacher_code;
  const teacherCodeHashFromQuery = parsedQuery.data.teacher_code_hash;
  const teacherCodeHeader = request.headers.get('x-teacher-code');
  const teacherCodeHashHeader = request.headers.get('x-teacher-code-hash');
  const teacher_code = teacherCodeFromQuery ?? teacherCodeHeader;
  const teacher_code_hash = teacherCodeHashFromQuery ?? teacherCodeHashHeader;

  const resolvedTeacherHash = teacher_code
    ? await hashCode(teacher_code, class_code)
    : teacher_code_hash;

  if (!resolvedTeacherHash) {
    return badRequest('Missing teacher code.');
  }

  const { data: classRow, error: classError } = await supabase
    .from('classes')
    .select('class_code, teacher_code_hash')
    .eq('class_code', class_code)
    .maybeSingle();

  if (classError) {
    return internalServerError('Failed to load class.');
  }

  if (!classRow) {
    return notFound('Class code not found.');
  }

  if (classRow.teacher_code_hash !== resolvedTeacherHash) {
    return forbidden('Invalid teacher code.');
  }

  const [{ count: totalStudents, error: totalError }, { count: activeStudents, error: activeError }]
    = await Promise.all([
      supabase
        .from('students')
        .select('id', { count: 'exact', head: true })
        .eq('class_code', class_code),
      supabase
        .from('students')
        .select('id', { count: 'exact', head: true })
        .eq('class_code', class_code)
        .gte('last_seen_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
    ]);

  if (totalError || activeError) {
    return internalServerError('Failed to load student stats.');
  }

  const { data: students, error: studentsError } = await supabase
    .from('students')
    .select('id, display_name, last_seen_at')
    .eq('class_code', class_code);

  if (studentsError) {
    return internalServerError('Failed to load student list.');
  }

  const { data: progressRows, error: progressError } = await supabase
    .from('progress')
    .select('activity_id, updated_at, student_id, students!inner(class_code)')
    .eq('students.class_code', class_code);

  if (progressError) {
    return internalServerError('Failed to load progress stats.');
  }

  const activitySummary = new Map<
    string,
    { activity_id: string; total: number; updated_at_buckets: Record<string, number> }
  >();
  const studentCompletionCounts = new Map<string, number>();

  for (const row of progressRows ?? []) {
    const activityId = row.activity_id as string;
    const bucket = formatDateBucket(row.updated_at as string);
    const current = activitySummary.get(activityId) ?? {
      activity_id: activityId,
      total: 0,
      updated_at_buckets: {},
    };

    current.total += 1;
    current.updated_at_buckets[bucket] = (current.updated_at_buckets[bucket] ?? 0) + 1;
    activitySummary.set(activityId, current);

    const studentId = row.student_id as string;
    studentCompletionCounts.set(
      studentId,
      (studentCompletionCounts.get(studentId) ?? 0) + 1,
    );
  }

  const leaderboard = (students ?? [])
    .map((student) => ({
      student_id: student.id,
      display_name: student.display_name,
      completed: studentCompletionCounts.get(student.id) ?? 0,
      last_seen_at: student.last_seen_at,
    }))
    .sort((a, b) => b.completed - a.completed)
    .slice(0, 10);

  return jsonResponse({
    class_code,
    totals: {
      students: totalStudents ?? 0,
      active_last_24h: activeStudents ?? 0,
    },
    activities: Array.from(activitySummary.values()).sort((a, b) =>
      a.activity_id.localeCompare(b.activity_id),
    ),
    leaderboard,
  });
});
