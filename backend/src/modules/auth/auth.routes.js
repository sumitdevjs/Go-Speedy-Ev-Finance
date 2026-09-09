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
const { errorResponse } = require('../../utils/response');
const env = require('../../config/env');

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

    // Capture frontend origin so callback redirects to the exact port/host the user initiated from
    let clientOrigin = env.FRONTEND_URL && env.FRONTEND_URL !== '*' ? env.FRONTEND_URL : '';
    if (req.headers.referer) {
      try {
        clientOrigin = new URL(req.headers.referer).origin;
      } catch (_) {}
    }

    passport.authenticate('google', {
      scope: ['profile', 'email'],
      session: false,
      state: clientOrigin || 'http://localhost:3000',
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
    // Resolve destination frontend origin from OAuth state or env fallback
    const targetOrigin =
      req.query.state ||
      (env.FRONTEND_URL && env.FRONTEND_URL !== '*' ? env.FRONTEND_URL : 'http://localhost:3000');

    passport.authenticate('google', { session: false }, async (err, result) => {
      if (err || !result) {
        console.error('Google OAuth error:', err);
        if (err?.code === 'NOT_REGISTERED' || err?.message?.includes('not registered')) {
          return res.redirect(`${targetOrigin}/?error=not_registered`);
        }
        if (err?.code === 'ACCOUNT_DEACTIVATED' || err?.message?.includes('deactivated')) {
          return res.redirect(`${targetOrigin}/?error=account_deactivated`);
        }
        return res.redirect(`${targetOrigin}/?error=oauth_failed`);
      }

      try {
        const { accessToken, refreshToken, user } = result;
        const isProduction = env.NODE_ENV === 'production';
        const cookieOpts = { httpOnly: true, secure: isProduction, sameSite: 'lax' };

        res.cookie('access_token', accessToken, { ...cookieOpts, maxAge: 15 * 60 * 1000 });
        res.cookie('refresh_token', refreshToken, { ...cookieOpts, maxAge: 7 * 24 * 60 * 60 * 1000 });
        res.cookie('user_id', user.id, { ...cookieOpts, maxAge: 7 * 24 * 60 * 60 * 1000 });

        return res.redirect(`${targetOrigin}/oauth-callback`);
      } catch (error) {
        console.error('Cookie/redirect error:', error);
        return res.redirect(`${targetOrigin}/?error=oauth_failed`);
      }
    })(req, res, next);
  }
);

module.exports = router;
