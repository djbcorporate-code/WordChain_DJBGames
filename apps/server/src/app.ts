import cookieParser from 'cookie-parser';
import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { authenticateSession } from './middleware/auth.middleware.js';
import adminRoutes from './modules/admin/admin.routes.js';
import authRoutes from './modules/auth/auth.routes.js';
import profileRoutes from './modules/profile/profile.routes.js';
import leaderboardRoutes from './modules/ranking/leaderboard.routes.js';
import { isAllowedOrigin } from './utils/cors.js';

dotenv.config();

export const app = express();

app.use(
  cors({
    origin: (origin, callback) => {
      if (isAllowedOrigin(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS blocked for origin: ${origin}`));
      }
    },
    credentials: true,
  })
);

// Standard HTTP security response headers
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

app.use(cookieParser(process.env.COOKIE_SECRET || 'dev_cookie_secret_wordchain'));
app.use(express.json());
app.use(authenticateSession);

// In-Memory Rate Limiting for Authentication endpoints
const authRateLimitMap = new Map<string, { count: number; resetAt: number }>();
const AUTH_RATE_WINDOW_MS = 60 * 1000;
const AUTH_MAX_REQUESTS = 60;

const authRateLimiter = (req: express.Request, res: express.Response, next: express.NextFunction): void => {
  if (process.env.NODE_ENV === 'test') {
    return next();
  }
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const record = authRateLimitMap.get(ip);

  if (!record || now > record.resetAt) {
    authRateLimitMap.set(ip, { count: 1, resetAt: now + AUTH_RATE_WINDOW_MS });
    return next();
  }

  record.count++;
  if (record.count > AUTH_MAX_REQUESTS) {
    res.status(429).json({
      success: false,
      message: 'Too many authentication attempts. Please wait a minute before trying again.',
      code: 'RATE_LIMITED',
    });
    return;
  }

  next();
};

// Periodic cleanup of expired rate limit entries
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of authRateLimitMap.entries()) {
    if (now > entry.resetAt) {
      authRateLimitMap.delete(ip);
    }
  }
}, 5 * 60 * 1000).unref();

// Health check
app.get('/api/health', (_req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'WordChain API & Game Engine',
    version: '0.1.0',
  });
});

// Auth Routes (Rate Limited)
app.use('/api/v1/auth', authRateLimiter, authRoutes);

// Profile & Career Routes
app.use('/api/v1/profile', profileRoutes);

// Global & Seasonal Leaderboard Routes
app.use('/api/v1/leaderboards', leaderboardRoutes);

// Admin Telemetry & Moderation Routes
app.use('/api/v1/admin', adminRoutes);

// In production or when web dist exists, serve static client bundle & handle SPA routing
let webDistPath: string | null = null;
try {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const candidates = [
    path.resolve(__dirname, '../../web/dist'),
    path.resolve(__dirname, '../../../apps/web/dist'),
    path.resolve(process.cwd(), 'apps/web/dist'),
    path.resolve(process.cwd(), 'dist/public'),
    path.resolve(process.cwd(), 'public'),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate) && fs.existsSync(path.join(candidate, 'index.html'))) {
      webDistPath = candidate;
      break;
    }
  }
} catch {
  // Ignore in environments where fileURLToPath is unavailable
}

if (webDistPath) {
  app.use(express.static(webDistPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) {
      return next();
    }
    res.sendFile(path.join(webDistPath!, 'index.html'));
  });
}

// Fallback 404 for unhandled API or missing routes
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found',
  });
});

