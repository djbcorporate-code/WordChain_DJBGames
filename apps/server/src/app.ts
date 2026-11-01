import cookieParser from 'cookie-parser';
import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import { authenticateSession } from './middleware/auth.middleware.js';
import authRoutes from './modules/auth/auth.routes.js';
import profileRoutes from './modules/profile/profile.routes.js';
import leaderboardRoutes from './modules/ranking/leaderboard.routes.js';

dotenv.config();

export const app = express();

const clientOrigin = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

app.use(
  cors({
    origin: [clientOrigin, 'http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:3000'],
    credentials: true,
  })
);

app.use(cookieParser(process.env.COOKIE_SECRET || 'dev_cookie_secret_wordchain'));
app.use(express.json());
app.use(authenticateSession);

// Health check
app.get('/api/health', (_req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'WordChain API & Game Engine',
    version: '0.1.0',
  });
});

// Auth Routes
app.use('/api/v1/auth', authRoutes);

// Profile & Career Routes
app.use('/api/v1/profile', profileRoutes);

// Global & Seasonal Leaderboard Routes
app.use('/api/v1/leaderboards', leaderboardRoutes);

// Fallback 404
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found',
  });
});
