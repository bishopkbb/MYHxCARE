import { z } from 'zod';

export const passwordResetRequestSchema = z.object({
  identifier: z.string().min(1, 'Staff ID or email is required'),
});

export type PasswordResetRequestValues = z.infer<typeof passwordResetRequestSchema>;
