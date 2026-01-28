import { z } from 'zod';

export const teacherLoginSchema = z.object({
  classCode: z.string().min(2, 'Class code is required.'),
  teacherCode: z.string().min(2, 'Teacher code is required.'),
});
