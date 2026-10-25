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

const rateLimit = require('express-rate-limit');

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15,
  message: { success: false, message: 'Too many login attempts. Please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const forgotPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  message: { success: false, message: 'Too many OTP requests. Please try again in 1 hour.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const resetPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: { success: false, message: 'Too many attempts. Please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
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
router.post('/login', loginLimiter, validateLogin, authController.login.bind(authController));

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
 *         tools: [SMTP]
 *       400:
 *         description: User not found or invalid request
 */
router.post('/forgot-password', forgotPasswordLimiter, validateForgotPassword, authController.forgotPassword.bind(authController));

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
router.post('/reset-password', resetPasswordLimiter, validateResetPassword, authController.resetPassword.bind(authController));

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

/**
 * @openapi
 * /api/auth/profile:
 *   patch:
 *     summary: Update current user profile (name, email, phone)
 *     tags: [Auth]
 *     security:
 *       - cookieAuth: []
 */
router.patch('/profile', requireAuth, authController.updateProfile.bind(authController));

/**
 * @openapi
 * /api/auth/change-password:
 *   patch:
 *     summary: Change current user password
 *     tags: [Auth]
 *     security:
 *       - cookieAuth: []
 */
router.patch('/change-password', requireAuth, resetPasswordLimiter, authController.changePassword.bind(authController));

const passport = require('../../config/passport');
const authService = require('./auth.service');
const supabase = require('../../config/db');
const { errorResponse, successResponse } = require('../../utils/response');
const env = require('../../config/env');
const crypto = require('crypto');
const { allowedOrigins, isAllowedOrigin } = require('../../config/allowedOrigins');

// Fallback when a requested redirect target isn't on the allow-list.
const DEFAULT_FRONTEND_ORIGIN = allowedOrigins[0] || 'http://localhost:3000';

const jwt = require('jsonwebtoken');

// ─── One-time OAuth exchange store ────────────────────────────────────────────
// ─── One-time OAuth exchange store ────────────────────────────────────────────
// Opaque random token with atomic database consumption across instances
const oauthCodeStore = new Map();

async function storeOAuthCode(accessToken, refreshToken, userId) {
  const rawCode = crypto.randomBytes(32).toString('hex');
  const codeHash = crypto.createHash('sha256').update(rawCode).digest('hex');
  const expiresAt = Date.now() + 60_000;

  const payload = { code_hash: codeHash, accessToken, refreshToken, userId, expiresAt };
  oauthCodeStore.set(rawCode, payload);
  setTimeout(() => oauthCodeStore.delete(rawCode), 65_000);

  try {
    await supabase.from('audit_logs').insert([{
      action: 'OAUTH_EXCHANGE_CODE',
      entity_type: 'oauth_code',
      user_id: userId,
      changes: payload,
      created_at: new Date().toISOString()
    }]);
  } catch (err) {
    console.error('Failed to persist OAuth exchange code to DB:', err);
  }

  return rawCode;
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

    let clientOrigin = req.query.origin;
    if (!isAllowedOrigin(clientOrigin) && req.headers.referer) {
      try {
        clientOrigin = new URL(req.headers.referer).origin;
      } catch (_) { }
    }
    if (!isAllowedOrigin(clientOrigin)) clientOrigin = DEFAULT_FRONTEND_ORIGIN;

    const nonce = crypto.randomBytes(16).toString('hex');
    const isProduction = env.NODE_ENV === 'production';
    res.cookie('oauth_nonce', nonce, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: 10 * 60 * 1000,
    });

    const statePayload = jwt.sign(
      { origin: clientOrigin, nonce, type: 'oauth_state' },
      env.JWT_SECRET,
      { expiresIn: '10m' }
    );

    passport.authenticate('google', {
      scope: ['profile', 'email'],
      session: false,
      state: statePayload,
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
    const rawState = req.query.state;
    const expectedNonce = req.cookies?.oauth_nonce;

    // Strict validation: state and nonce cookie MUST be present and valid
    if (!rawState || !expectedNonce) {
      console.warn('OAuth callback missing state or nonce cookie - potential CSRF attempt');
      return res.redirect(`${DEFAULT_FRONTEND_ORIGIN}/?error=oauth_csrf_detected`);
    }

    let cleanOrigin = DEFAULT_FRONTEND_ORIGIN;
    try {
      const decodedState = jwt.verify(rawState, env.JWT_SECRET);
      if (decodedState?.type !== 'oauth_state' || !decodedState.nonce || decodedState.nonce !== expectedNonce) {
        console.warn('OAuth state nonce mismatch or invalid type - potential CSRF attempt');
        return res.redirect(`${DEFAULT_FRONTEND_ORIGIN}/?error=oauth_csrf_detected`);
      }
      if (isAllowedOrigin(decodedState.origin)) {
        cleanOrigin = String(decodedState.origin).replace(/\/+$/, '');
      }
    } catch (err) {
      console.warn('OAuth state verification failed:', err.message);
      return res.redirect(`${DEFAULT_FRONTEND_ORIGIN}/?error=oauth_csrf_detected`);
    }

    res.clearCookie('oauth_nonce');

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
        const code = await storeOAuthCode(accessToken, refreshToken, user.id);
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
router.post('/oauth/exchange', async (req, res) => {
  const { code } = req.body;
  if (!code || typeof code !== 'string') {
    return errorResponse(res, 400, 'Missing exchange code');
  }

  // 1. Atomic consumption in database to prevent multi-instance replays
  const codeHash = crypto.createHash('sha256').update(code).digest('hex');
  let entry = null;

  try {
    const { data: deletedRows, error: delErr } = await supabase
      .from('audit_logs')
      .delete()
      .eq('entity_type', 'oauth_code')
      .eq('action', 'OAUTH_EXCHANGE_CODE')
      .filter('changes->>code_hash', 'eq', codeHash)
      .select('changes');

    if (!delErr && deletedRows && deletedRows.length > 0) {
      entry = deletedRows[0].changes;
    }
  } catch (err) {
    console.error('DB exchange lookup error:', err);
  }

  // Fallback to in-memory store if DB query double doesn't match
  if (!entry && oauthCodeStore.has(code)) {
    entry = oauthCodeStore.get(code);
    oauthCodeStore.delete(code);
  }

  if (!entry) {
    return errorResponse(res, 400, 'Invalid or expired OAuth code. Please sign in again.');
  }

  if (entry.expiresAt && Date.now() > entry.expiresAt) {
    return errorResponse(res, 400, 'OAuth code has expired. Please sign in again.');
  }

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
