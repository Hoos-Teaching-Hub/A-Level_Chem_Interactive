import { z } from 'zod';

export const joinPayloadSchema = z.object({
  classCode: z.string().min(2, 'Class code is required.'),
  studentCode: z.string().min(2, 'Student code is required.'),
  displayName: z.string().min(2, 'Display name is required.'),
});
