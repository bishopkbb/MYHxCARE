import { z } from 'zod';

export const loginSchema = z.object({
  identifier: z.string().min(1, 'Staff ID or email is required'),
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional(),
});

export type LoginFormValues = z.infer<typeof loginSchema>;
