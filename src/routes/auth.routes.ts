import { Router } from 'express';
import { authController } from '../controllers/auth.controller.js';
import { oauthController } from '../controllers/oauth.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { createRateLimiter } from '../middleware/rateLimiter.middleware.js';
import { config } from '../config/index.js';

const router = Router();

const loginLimiter = createRateLimiter({
  keyPrefix: 'login',
  maxRequests: config.rateLimit.loginMax,
  windowSeconds: config.rateLimit.loginWindowSec,
  identifierFn: (req) => req.ip || 'unknown',
});

const registerLimiter = createRateLimiter({
  keyPrefix: 'register',
  maxRequests: 10,
  windowSeconds: 60,
  identifierFn: (req) => req.ip || 'unknown',
});

// Authentication Endpoints
router.post('/register', registerLimiter, (req, res, next) => authController.register(req, res, next));
router.post('/login', loginLimiter, (req, res, next) => authController.login(req, res, next));
router.post('/refresh', (req, res, next) => authController.refreshToken(req, res, next));
router.post('/logout', authenticate, (req, res, next) => authController.logout(req, res, next));
router.post('/logout-all', authenticate, (req, res, next) => authController.logoutAll(req, res, next));
router.post('/forgot-password', (req, res, next) => authController.forgotPassword(req, res, next));
router.post('/reset-password', (req, res, next) => authController.resetPassword(req, res, next));
router.post('/verify-email', (req, res, next) => authController.verifyEmail(req, res, next));

// OAuth Endpoints
router.get('/oauth/:provider', (req, res, next) => oauthController.getOAuthUrl(req, res, next));
router.get('/oauth/:provider/callback', (req, res, next) => oauthController.handleCallback(req, res, next));
router.post('/oauth/:provider/callback', (req, res, next) => oauthController.handleCallback(req, res, next));

export default router;
