const express = require('express');
const { z } = require('zod');
const authController = require('./auth.controller');
const requireAuth = require('../../middleware/auth');
const requestLogger = require('../../middleware/requestLogger');

const router = express.Router();

// Validation Schemas
const loginSchema = z.object({
  email: z.string().min(1, 'Phone number or email is required'),
  password: z.string().min(1, 'Password is required'),
});

const forgotPasswordSchema = z.object({
  email: z.string().email('Valid email address is required'),
});

const resetPasswordSchema = z.object({
  email: z.string().email('Valid email address is required'),
  otp: z.string().min(6, 'OTP code must be 6 digits').max(6, 'OTP code must be 6 digits'),
  newPassword: z.string().min(6, 'Password must be at least 6 characters long'),
});

// Middleware for validation
const validateLogin = (req, res, next) => {
  loginSchema.parse(req.body);
  next();
};

const validateForgotPassword = (req, res, next) => {
  try {
    forgotPasswordSchema.parse(req.body);
    next();
  } catch (err) {
    return res.status(400).json({ success: false, message: err.errors?.[0]?.message || 'Validation error' });
  }
};

const validateResetPassword = (req, res, next) => {
  try {
    resetPasswordSchema.parse(req.body);
    next();
  } catch (err) {
    return res.status(400).json({ success: false, message: err.errors?.[0]?.message || 'Validation error' });
  }
};

/**
 * @openapi
 * /api/auth/login:
 *   post:
 *     summary: Login user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 *         headers:
 *           Set-Cookie:
 *             schema:
 *               type: string
 *               example: access_token=abcde12345; Path=/; HttpOnly
 *       400:
 *         description: Validation error
 *       401:
 *         description: Invalid credentials
 */
router.post('/login', validateLogin, authController.login.bind(authController));

/**
 * @openapi
 * /api/auth/forgot-password:
 *   post:
 *     summary: Request 6-digit OTP code to reset password
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email:
 *                 type: string
 *     responses:
 *       200:
 *         description: OTP sent successfully
 *       400:
 *         description: User not found or invalid request
 */
router.post('/forgot-password', validateForgotPassword, authController.forgotPassword.bind(authController));

/**
 * @openapi
 * /api/auth/reset-password:
 *   post:
 *     summary: Verify OTP and reset password
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, otp, newPassword]
 *             properties:
 *               email:
 *                 type: string
 *               otp:
 *                 type: string
 *               newPassword:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password reset successful
 *       400:
 *         description: Invalid or expired OTP
 */
router.post('/reset-password', validateResetPassword, authController.resetPassword.bind(authController));

/**
 * @openapi
 * /api/auth/refresh:
 *   post:
 *     summary: Refresh access token
 *     tags: [Auth]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Tokens refreshed
 *       401:
 *         description: Invalid or expired refresh token
 */
router.post('/refresh', authController.refresh.bind(authController));

/**
 * @openapi
 * /api/auth/logout:
 *   post:
 *     summary: Logout user
 *     tags: [Auth]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Logged out
 */
router.post('/logout', requireAuth, authController.logout.bind(authController));

/**
 * @openapi
 * /api/auth/me:
 *   get:
 *     summary: Get current user profile
 *     tags: [Auth]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: User profile
 *       401:
 *         description: Unauthorized
 */
router.get('/me', requireAuth, authController.me.bind(authController));

const passport = require('../../config/passport');
const authService = require('./auth.service');
const { errorResponse, successResponse } = require('../../utils/response');
const env = require('../../config/env');
const crypto = require('crypto');
const { allowedOrigins, isAllowedOrigin } = require('../../config/allowedOrigins');

// Fallback when a requested redirect target isn't on the allow-list.
const DEFAULT_FRONTEND_ORIGIN = allowedOrigins[0] || 'http://localhost:3000';

// ─── One-time OAuth exchange store ────────────────────────────────────────────
// Maps a short-lived random code → { accessToken, refreshToken, userId }
// Each code expires after 60 seconds and can only be used once.
const oauthCodeStore = new Map();
function storeOAuthCode(accessToken, refreshToken, userId) {
  const code = crypto.randomBytes(32).toString('hex');
  oauthCodeStore.set(code, { accessToken, refreshToken, userId, expiresAt: Date.now() + 60_000 });
  // Auto-cleanup after 65s
  setTimeout(() => oauthCodeStore.delete(code), 65_000);
  return code;
}

/**
 * @openapi
 * /api/auth/google:
 *   get:
 *     summary: Initiate Google OAuth sign-in
 *     tags: [Auth]
 *     responses:
 *       302:
 *         description: Redirects to Google consent screen
 */
router.get(
  '/google',
  (req, res, next) => {
    if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
      return res.status(503).json({ success: false, message: 'Google OAuth is not configured on this server.' });
    }

    // Only trust an origin on our allow-list — letting client input pick the
    // redirect target is an open-redirect straight to account takeover.
    let clientOrigin = req.query.origin;
    if (!isAllowedOrigin(clientOrigin) && req.headers.referer) {
      try {
        clientOrigin = new URL(req.headers.referer).origin;
      } catch (_) { }
    }
    if (!isAllowedOrigin(clientOrigin)) clientOrigin = DEFAULT_FRONTEND_ORIGIN;

    passport.authenticate('google', {
      scope: ['profile', 'email'],
      session: false,
      state: clientOrigin,
    })(req, res, next);
  }
);

/**
 * @openapi
 * /api/auth/google/callback:
 *   get:
 *     summary: Google OAuth callback
 *     tags: [Auth]
 *     responses:
 *       302:
 *         description: Redirects to frontend /oauth-callback after setting auth cookies
 */
router.get(
  '/google/callback',
  (req, res, next) => {
    // `state` is client-controlled on the wire — validate again, don't trust it.
    const cleanOrigin = isAllowedOrigin(req.query.state)
      ? String(req.query.state).replace(/\/+$/, '')
      : DEFAULT_FRONTEND_ORIGIN;

    passport.authenticate('google', { session: false }, async (err, result) => {
      if (err || !result) {
        console.error('Google OAuth error:', err);
        if (err?.code === 'NOT_REGISTERED' || err?.message?.includes('not registered')) {
          return res.redirect(`${cleanOrigin}/?error=not_registered`);
        }
        if (err?.code === 'ACCOUNT_DEACTIVATED' || err?.message?.includes('deactivated')) {
          return res.redirect(`${cleanOrigin}/?error=account_deactivated`);
        }
        return res.redirect(`${cleanOrigin}/?error=oauth_failed`);
      }

      try {
        const { accessToken, refreshToken, user } = result;
        // Generate a short-lived one-time code instead of setting cookies directly.
        // Cookies set during a cross-domain redirect (backend → frontend) are blocked
        // by the browser. The frontend will exchange this code via a same-site AJAX
        // call (through the Next.js proxy) which CAN set cookies correctly.
        const code = storeOAuthCode(accessToken, refreshToken, user.id);
        return res.redirect(`${cleanOrigin}/oauth-callback?code=${code}`);
      } catch (error) {
        console.error('OAuth callback error:', error);
        return res.redirect(`${cleanOrigin}/?error=oauth_failed`);
      }
    })(req, res, next);
  }
);

/**
 * @openapi
 * /api/auth/oauth/exchange:
 *   post:
 *     summary: Exchange a one-time OAuth code for auth cookies
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [code]
 *             properties:
 *               code:
 *                 type: string
 *     responses:
 *       200:
 *         description: Auth cookies set, user profile returned
 *       400:
 *         description: Invalid or expired code
 */
router.post('/oauth/exchange', (req, res) => {
  const { code } = req.body;
  if (!code) {
    return errorResponse(res, 400, 'Missing exchange code');
  }

  const entry = oauthCodeStore.get(code);
  if (!entry) {
    return errorResponse(res, 400, 'Invalid or expired OAuth code. Please sign in again.');
  }
  if (Date.now() > entry.expiresAt) {
    oauthCodeStore.delete(code);
    return errorResponse(res, 400, 'OAuth code has expired. Please sign in again.');
  }

  // Consume the code (one-time use)
  oauthCodeStore.delete(code);

  const { accessToken, refreshToken, userId } = entry;
  const isProduction = env.NODE_ENV === 'production';
  const cookieOpts = { httpOnly: true, secure: isProduction, sameSite: isProduction ? 'none' : 'lax' };
  if (env.COOKIE_DOMAIN) cookieOpts.domain = env.COOKIE_DOMAIN;

  res.cookie('access_token', accessToken, { ...cookieOpts, maxAge: 15 * 60 * 1000 });
  res.cookie('refresh_token', refreshToken, { ...cookieOpts, maxAge: 7 * 24 * 60 * 60 * 1000 });
  res.cookie('user_id', userId, { ...cookieOpts, maxAge: 7 * 24 * 60 * 60 * 1000 });

  return successResponse(res, 200, { userId }, 'OAuth session established');
});

module.exports = router;
