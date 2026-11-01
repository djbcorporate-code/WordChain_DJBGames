import express from 'express';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { ProfileService } from './profile.service.js';

const router = express.Router();

/**
 * GET /api/v1/profile/:username
 * Public scholar profile, career stats, and recent match history.
 */
router.get('/:username', async (req, res) => {
  try {
    const profile = await ProfileService.getPublicProfile(req.params.username);
    res.status(200).json({ success: true, profile });
  } catch (err: any) {
    res.status(404).json({ success: false, message: err.message });
  }
});

/**
 * PATCH /api/v1/profile/avatar
 * Changes the active scholar avatar (requires authentication and account level unlock).
 */
router.patch('/avatar', requireAuth, async (req, res) => {
  try {
    const user = req.user!;
    const { avatarId } = req.body;

    if (!avatarId) {
      return res.status(400).json({ success: false, message: 'avatarId is required.' });
    }

    const result = await ProfileService.updateAvatar(user.userId, avatarId);
    res.status(200).json(result);
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
});

export default router;
