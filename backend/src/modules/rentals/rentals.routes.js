const express = require('express');
const { z } = require('zod');
const rentalsController = require('./rentals.controller');
const requireAuth = require('../../middleware/auth');
const requestLogger = require('../../middleware/requestLogger');

const router = express.Router();
router.use(requireAuth);

const createRentalSchema = z.object({
  ev_model_id: z.string().uuid(),
  name: z.string().min(1),
  phone: z.string().min(10),
  gender: z.enum(['male', 'female']),
  address: z.string().min(1),
  chassis_no: z.string().min(1),
  motor_ctrl_no: z.string().min(1),
  battery_no: z.string().min(1),
  rto_type: z.string().min(1),
  hp_financer: z.string().min(1),
  date_of_purchase: z.string().min(1),
  date_of_delivery: z.string().min(1),
  booking_amount: z.number().min(0),
  downpayment_paid: z.number().min(0),
  downpayment_mode: z.string().min(1),
  installment_daily_rate: z.number().min(0),
  installment_frequency: z.enum(['daily', 'weekly', 'monthly']),
  start_date: z.string().min(1),
  total_months: z.number().min(1),
  references: z.array(z.object({
    category: z.string().min(1),
    name: z.string().min(1),
    area: z.string().min(1),
    phone: z.string().min(10)
  })).min(1),
  guarantors: z.array(z.object({
    gender: z.string().min(1),
    name: z.string().min(1),
    address: z.string().min(1),
    phone: z.string().min(10)
  })).min(2),
  aadhar_path: z.string().optional(),
  pan_path: z.string().optional(),
  cheque_path: z.string().optional(),
  electricity_bill_path: z.string().optional(),
  tenant_photo_path: z.string().optional(),
  scooty_photo_path: z.string().optional(),
}).passthrough();

const updateRentalSchema = z.object({}).passthrough();

const validateBody = (schema) => (req, res, next) => {
  schema.parse(req.body);
  next();
};

/**
 * @openapi
 * /api/rentals:
 *   get:
 *     summary: List tenants with filters
 *     tags: [Rentals]
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *       - in: query
 *         name: overdue_days
 *         schema: { type: integer }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *     responses:
 *       200:
 *         description: Paginated tenant list with computed balance
 */
router.get('/', rentalsController.getAll.bind(rentalsController));

/**
 * @openapi
 * /api/rentals/{id}:
 *   get:
 *     summary: Get single rental detail
 *     tags: [Rentals]
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Rental details
 */
router.get('/:id', rentalsController.getById.bind(rentalsController));

/**
 * @openapi
 * /api/rentals:
 *   post:
 *     summary: Create new rental
 *     tags: [Rentals]
 *     security: [{ cookieAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { type: object }
 *     responses:
 *       201:
 *         description: Created
 */
router.post(
  '/', 
  validateBody(createRentalSchema), 
  requestLogger('tenants', 'CREATE_RENTAL'), 
  rentalsController.create.bind(rentalsController)
);

/**
 * @openapi
 * /api/rentals/{id}:
 *   patch:
 *     summary: Update rental
 *     tags: [Rentals]
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { type: object }
 *     responses:
 *       200:
 *         description: Updated
 */
router.patch(
  '/:id', 
  validateBody(updateRentalSchema), 
  requestLogger('tenants', 'UPDATE_RENTAL'), 
  rentalsController.update.bind(rentalsController)
);

/**
 * @openapi
 * /api/rentals/{id}/cancel:
 *   patch:
 *     summary: Cancel rental and restore stock
 *     tags: [Rentals]
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Cancelled
 */
router.patch(
  '/:id/cancel', 
  requestLogger('tenants', 'CANCEL_RENTAL'), 
  rentalsController.cancel.bind(rentalsController)
);

/**
 * @openapi
 * /api/rentals/{id}/complete:
 *   patch:
 *     summary: Complete a rental
 *     tags: [Rentals]
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Completed
 */
router.patch(
  '/:id/complete', 
  requestLogger('tenants', 'COMPLETE_RENTAL'), 
  rentalsController.complete.bind(rentalsController)
);

module.exports = router;
