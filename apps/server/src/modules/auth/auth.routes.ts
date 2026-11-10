import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { AuthController } from './auth.controller.js';

const router = Router();

router.post('/register', AuthController.register);
router.post('/login', AuthController.login);
router.post('/guest', AuthController.loginAsGuest);
router.post('/logout', AuthController.logout);
router.get('/me', requireAuth, AuthController.getMe);
router.post('/verify-email', AuthController.verifyEmail);
router.post('/forgot-password', AuthController.forgotPassword);
router.post('/reset-password', AuthController.resetPassword);

export default router;
