import { AuthSession } from '@wordchain/shared';
import { NextFunction, Request, Response } from 'express';
import { verifyJwt } from '../utils/security.js';

declare global {
  namespace Express {
    interface Request {
      user?: AuthSession;
    }
  }
}

export function extractAuthSession(req: Request): AuthSession | null {
  // Check cookie first
  let token = req.cookies?.token;

  // Fallback to Authorization: Bearer <token>
  if (!token && req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return null;
  }

  return verifyJwt<AuthSession>(token);
}

export function authenticateSession(req: Request, _res: Response, next: NextFunction): void {
  const session = extractAuthSession(req);
  if (session) {
    req.user = session;
  }
  next();
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const session = extractAuthSession(req);
  if (!session) {
    res.status(401).json({
      success: false,
      message: 'Authentication required. Please log in.',
      code: 'UNAUTHORIZED',
    });
    return;
  }
  if (session.role === 'BANNED') {
    res.status(403).json({
      success: false,
      message: 'Account has been suspended.',
      code: 'ACCOUNT_BANNED',
    });
    return;
  }
  req.user = session;
  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const session = extractAuthSession(req);
  if (!session || session.role !== 'ADMIN') {
    res.status(403).json({
      success: false,
      message: 'Administrator privileges required.',
      code: 'FORBIDDEN',
    });
    return;
  }
  req.user = session;
  next();
}
