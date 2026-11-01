import express from 'express';
import { requireAdmin, requireAuth } from '../../middleware/auth.middleware.js';
import { AdminService } from './admin.service.js';

const router = express.Router();

// Enforce authentication & Administrator privileges on all admin endpoints
router.use(requireAuth);
router.use(requireAdmin);

/**
 * GET /api/v1/admin/telemetry
 * Real-time system load, active rooms, player counts, queue depths, and memory stats.
 */
router.get('/telemetry', async (_req, res) => {
  try {
    const telemetry = await AdminService.getTelemetry();
    res.status(200).json({ success: true, telemetry });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/v1/admin/users/:userId/suspend
 * Suspends a scholar and terminates their active WebSocket connections immediately.
 */
router.post('/users/:userId/suspend', async (req, res) => {
  try {
    const admin = req.user!;
    const { userId } = req.params;
    const { reason } = req.body;
    const ipAddress = req.ip;

    const result = await AdminService.suspendUser(
      admin.userId,
      userId,
      reason,
      ipAddress
    );
    res.status(200).json(result);
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/v1/admin/users/:userId/unsuspend
 * Reinstates a suspended scholar account.
 */
router.post('/users/:userId/unsuspend', async (req, res) => {
  try {
    const admin = req.user!;
    const { userId } = req.params;
    const ipAddress = req.ip;

    const result = await AdminService.unsuspendUser(
      admin.userId,
      userId,
      ipAddress
    );
    res.status(200).json(result);
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/v1/admin/lexicon/add-word
 * Dynamically inserts a custom word into the in-memory lexicon.
 */
router.post('/lexicon/add-word', async (req, res) => {
  try {
    const admin = req.user!;
    const { word } = req.body;
    const ipAddress = req.ip;

    if (!word) {
      return res.status(400).json({ success: false, message: 'word is required.' });
    }

    const result = await AdminService.addWordToLexicon(admin.userId, word, ipAddress);
    res.status(200).json(result);
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/v1/admin/lexicon/ban-word
 * Dynamically bans a word from the active lexicon.
 */
router.post('/lexicon/ban-word', async (req, res) => {
  try {
    const admin = req.user!;
    const { word, reason } = req.body;
    const ipAddress = req.ip;

    if (!word) {
      return res.status(400).json({ success: false, message: 'word is required.' });
    }

    const result = await AdminService.banWordFromLexicon(
      admin.userId,
      word,
      reason,
      ipAddress
    );
    res.status(200).json(result);
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/v1/admin/audit-logs
 * Retrieves chronological administrative audit logs.
 */
router.get('/audit-logs', async (req, res) => {
  try {
    const limit = Math.min(100, Math.max(5, parseInt(req.query.limit as string, 10) || 25));
    const logs = await AdminService.getAuditLogs(limit);
    res.status(200).json({ success: true, logs });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
