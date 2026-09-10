const express = require('express');
const { z } = require('zod');
const staffController = require('./staff.controller');
const requireAuth = require('../../middleware/auth');
const { requireAdmin } = require('../../middleware/roleGuard');

const router = express.Router();

// Apply auth and admin guard to all staff routes
router.use(requireAuth);
router.use(requireAdmin);

// Validation Schemas
const passwordSchema = z.string()
  .min(6, 'Password must be at least 6 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');

const emailSchema = z.string()
  .email()
  .optional()
  .or(z.literal(''));

const createStaffSchema = z.object({
  name: z.string().min(1),
  phone: z.string().min(10),
  email: emailSchema,
  password: passwordSchema,
  role: z.enum(['admin', 'staff']),
});

const updateStaffSchema = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().min(10).optional(),
  email: emailSchema,
  role: z.enum(['admin', 'staff']).optional(),
});

const validateBody = (schema) => (req, res, next) => {
  schema.parse(req.body);
  next();
};

/**
 * @openapi
 * /api/staff:
 *   get:
 *     summary: List all staff
 *     tags: [Staff]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: List of staff
 */
router.get('/', staffController.getAll.bind(staffController));

/**
 * @openapi
 * /api/staff:
 *   post:
 *     summary: Create new staff
 *     tags: [Staff]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, phone, password, role]
 *             properties:
 *               name: { type: string }
 *               phone: { type: string }
 *               email: { type: string }
 *               password: { type: string, description: "Must be >= 6 chars, contain an uppercase letter, a number, and a special character" }
 *               role: { type: string, enum: [admin, staff] }
 *     responses:
 *       201:
 *         description: Created
 */
router.post(
  '/',
  validateBody(createStaffSchema),
  staffController.create.bind(staffController)
);

/**
 * @openapi
 * /api/staff/{id}:
 *   patch:
 *     summary: Update staff details
 *     tags: [Staff]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               phone: { type: string }
 *               email: { type: string }
 *               role: { type: string, enum: [admin, staff] }
 *     responses:
 *       200:
 *         description: Updated
 */
router.patch(
  '/:id',
  validateBody(updateStaffSchema),
  staffController.update.bind(staffController)
);

/**
 * @openapi
 * /api/staff/{id}/password:
 *   patch:
 *     summary: Change staff password
 *     tags: [Staff]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [password]
 *             properties:
 *               password: { type: string, description: "Must be >= 6 chars, contain an uppercase letter, a number, and a special character" }
 *     responses:
 *       200:
 *         description: Password updated
 */
router.patch(
  '/:id/password', 
  validateBody(z.object({ password: passwordSchema })), 
  requestLogger('users', 'CHANGE_PASSWORD'), 
  staffController.changePassword.bind(staffController)
);

/**
 * @openapi
 * /api/staff/{id}/deactivate:
 *   patch:
 *     summary: Activate or deactivate staff
 *     tags: [Staff]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [is_active]
 *             properties:
 *               is_active: { type: boolean }
 *     responses:
 *       200:
 *         description: Activation status updated
 */
router.patch(
  '/:id/deactivate',
  validateBody(z.object({ is_active: z.boolean() })),
  staffController.toggleActive.bind(staffController)
);

module.exports = router;
