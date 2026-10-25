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

module.exports = router;

