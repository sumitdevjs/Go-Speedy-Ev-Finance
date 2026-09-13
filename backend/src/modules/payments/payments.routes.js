const express = require('express');
const { z } = require('zod');
const paymentsController = require('./payments.controller');
const requireAuth = require('../../middleware/auth');
const requestLogger = require('../../middleware/requestLogger');

const router = express.Router();
router.use(requireAuth);

const recordPaymentSchema = z.object({
  tenant_id: z.string().uuid(),
  amount: z.number().positive(),
  payment_date: z.string(), // YYYY-MM-DD
  mode: z.enum(['cash', 'online']),
  notes: z.string().nullable().optional(),
  gst_amount: z.number().min(0).optional()
});

const validateBody = (schema) => (req, res, next) => {
  schema.parse(req.body);
  next();
};

/**
 * @openapi
 * /api/payments:
 *   get:
 *     summary: Get payments
 *     tags: [Payments]
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: tenant_id
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: List of payments
 */
router.get('/', paymentsController.getAll.bind(paymentsController));

/**
 * @openapi
 * /api/payments:
 *   post:
 *     summary: Record a payment
 *     tags: [Payments]
 *     security: [{ cookieAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [tenant_id, amount, payment_date, mode]
 *             properties:
 *               tenant_id: { type: string }
 *               amount: { type: number }
 *               payment_date: { type: string }
 *               mode: { type: string, enum: [cash, online] }
 *               notes: { type: string }
 *     responses:
 *       201:
 *         description: Recorded payment and computed balance
 */
router.post(
  '/', 
  validateBody(recordPaymentSchema), 
  requestLogger('payments', 'RECORD_PAYMENT'), 
  paymentsController.record.bind(paymentsController)
);

module.exports = router;
