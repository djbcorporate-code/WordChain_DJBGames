import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  verifyEmailSchema,
} from '@wordchain/shared';
import { Request, Response } from 'express';
import { AuthService } from './auth.service.js';

const COOKIE_NAME = 'token';
const isProduction = process.env.NODE_ENV === 'production';

function setAuthCookie(res: Response, token: string): void {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/',
  });
}

function clearAuthCookie(res: Response): void {
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    path: '/',
  });
}

export class AuthController {
  static async register(req: Request, res: Response): Promise<void> {
    try {
      const parsed = registerSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          success: false,
          message: 'Invalid registration input',
          errors: parsed.error.flatten().fieldErrors,
        });
        return;
      }

      const result = await AuthService.register(parsed.data);
      setAuthCookie(res, result.token);

      res.status(201).json({
        success: true,
        message: 'Account successfully registered! Please check your email for the verification link.',
        user: result.user,
        token: result.token,
        verificationToken: process.env.NODE_ENV !== 'production' ? result.verificationToken : undefined,
      });
    } catch (err: any) {
      const status = err.message.includes('already exists') || err.message.includes('taken') ? 409 : 500;
      res.status(status).json({
        success: false,
        message: err.message || 'Registration failed',
      });
    }
  }

  static async login(req: Request, res: Response): Promise<void> {
    try {
      const parsed = loginSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          success: false,
          message: 'Invalid login input',
          errors: parsed.error.flatten().fieldErrors,
        });
        return;
      }

      const result = await AuthService.login(parsed.data);
      setAuthCookie(res, result.token);

      res.status(200).json({
        success: true,
        message: 'Login successful.',
        user: result.user,
        token: result.token,
      });
    } catch (err: any) {
      res.status(401).json({
        success: false,
        message: err.message || 'Login failed',
      });
    }
  }

  static async logout(_req: Request, res: Response): Promise<void> {
    clearAuthCookie(res);
    res.status(200).json({
      success: true,
      message: 'Logged out successfully.',
    });
  }

  static async getMe(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Not authenticated',
        });
        return;
      }

      const user = await AuthService.getFullUserProfile(req.user.userId);
      res.status(200).json({
        success: true,
        user,
      });
    } catch (err: any) {
      res.status(404).json({
        success: false,
        message: err.message || 'User not found',
      });
    }
  }

  static async verifyEmail(req: Request, res: Response): Promise<void> {
    try {
      const parsed = verifyEmailSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          success: false,
          message: 'Invalid verification token input',
        });
        return;
      }

      const result = await AuthService.verifyEmail(parsed.data);
      res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (err: any) {
      res.status(400).json({
        success: false,
        message: err.message || 'Email verification failed',
      });
    }
  }

  static async forgotPassword(req: Request, res: Response): Promise<void> {
    try {
      const parsed = forgotPasswordSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          success: false,
          message: 'Please provide a valid email address',
        });
        return;
      }

      const result = await AuthService.requestPasswordReset(parsed.data);
      res.status(200).json({
        success: true,
        message: 'If an account exists with this email, a password reset link has been dispatched.',
        resetToken: process.env.NODE_ENV !== 'production' ? result.resetToken : undefined,
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        message: err.message || 'Password reset request failed',
      });
    }
  }

  static async resetPassword(req: Request, res: Response): Promise<void> {
    try {
      const parsed = resetPasswordSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          success: false,
          message: 'Invalid reset password parameters',
          errors: parsed.error.flatten().fieldErrors,
        });
        return;
      }

      const result = await AuthService.resetPassword(parsed.data);
      res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (err: any) {
      res.status(400).json({
        success: false,
        message: err.message || 'Password reset failed',
      });
    }
  }
}
