import { z } from 'zod';
import { joinPayloadSchema } from '../validators/join';
import { teacherLoginSchema } from '../validators/teacher';

export const apiClient = {
  async join(payload: z.infer<typeof joinPayloadSchema>) {
    await Promise.resolve();
    console.log('api.join', payload);
  },
  async teacherLogin(payload: z.infer<typeof teacherLoginSchema>) {
    await Promise.resolve();
    console.log('api.teacherLogin', payload);
  },
};
