import { z } from 'zod';

export const displayNameSchema = z
  .string()
  .trim()
  .min(1, 'Display name must be at least 1 character')
  .max(32, 'Display name cannot exceed 32 characters');

export const usernameSchema = z
  .string()
  .trim()
  .min(3, 'Username must be at least 3 characters')
  .max(20, 'Username cannot exceed 20 characters')
  .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores');

export const passwordSchema = z
  .string()
  .min(6, 'Password must be at least 6 characters')
  .max(100, 'Password is too long');

export const registerSchema = z.object({
  displayName: displayNameSchema,
  username: usernameSchema,
  password: passwordSchema,
  email: z.string().email('Please enter a valid email address').optional(),
});

export const loginSchema = z
  .object({
    username: z.string().trim().min(1, 'Please enter your username').optional(),
    emailOrUsername: z.string().trim().min(1, 'Please enter your username').optional(),
    password: z.string().min(6, 'Password must be at least 6 characters'),
  })
  .refine((data) => Boolean(data.username || data.emailOrUsername), {
    message: 'Username is required',
    path: ['username'],
  });

export const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  newPassword: passwordSchema,
});

export const verifyEmailSchema = z.object({
  token: z.string().min(1, 'Verification token is required'),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;
