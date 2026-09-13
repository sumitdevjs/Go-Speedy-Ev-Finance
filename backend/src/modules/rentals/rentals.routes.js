const express = require('express');
const { z } = require('zod');
const rentalsController = require('./rentals.controller');
const requireAuth = require('../../middleware/auth');
const requestLogger = require('../../middleware/requestLogger');

const router = express.Router();
router.use(requireAuth);

const phoneSchema = z.string().regex(/^\d{10}$/, 'Phone number must be exactly 10 digits');

const createRentalSchema = z.object({
  ev_model_id: z.string().uuid(),
  name: z.string().min(1),
  phone: phoneSchema,
  gender: z.enum(['male', 'female']),
  address: z.string().min(1),
  chassis_no: z.string().min(1),
  motor_ctrl_no: z.string().min(1),
  battery_no: z.string().min(1),
  rto_type: z.string().min(1),
  hp_financer: z.string().min(1),
  date_of_purchase: z.string().min(1),
  date_of_delivery: z.string().min(1),
  booking_amount: z.number().min(0).optional(),
  downpayment_paid: z.number().min(0).optional(),
  downpayment_mode: z.string().optional(),
  installment_daily_rate: z.number().min(0).optional(),
  installment_frequency: z.enum(['daily', 'weekly', 'monthly']).optional(),
  start_date: z.string().optional(),
  total_months: z.number().min(0).optional(),
  status: z.string().optional(),
  include_gst: z.boolean().optional(),
  gst_percent: z.number().min(0).optional(),
  references: z.array(z.object({
    category: z.string().min(1),
    name: z.string().min(1),
    area: z.string().min(1),
    phone: phoneSchema
  })).optional(),
  guarantors: z.array(z.object({
    gender: z.string().min(1),
    name: z.string().min(1),
    address: z.string().min(1),
    phone: phoneSchema
  })).optional(),
  aadhar_path: z.string().optional(),
  pan_path: z.string().optional(),
  cheque_path: z.string().optional(),
  electricity_bill_path: z.string().optional(),
  tenant_photo_path: z.string().optional(),
  scooty_photo_path: z.string().optional(),
  rent_agreement_path: z.string().optional(),
  scooty_insurance_path: z.string().optional(),
  rider_insurance_path: z.string().optional(),
  rider_license_path: z.string().optional(),
  scooty_insurance_company: z.string().min(1, 'Scooty Insurance Company is required'),
  scooty_policy_number: z.string().min(1, 'Scooty Policy number is required'),
  scooty_policy_expiry: z.string().min(1, 'Scooty Expiry date is required'),
  rider_insurance_company: z.string().min(1, 'Rider Insurance Company is required'),
  rider_policy_number: z.string().min(1, 'Rider Policy number is required'),
  rider_policy_expiry: z.string().min(1, 'Rider Expiry date is required'),
  invoice_generated: z.boolean().optional(),
  invoice_doc_path: z.string().optional(),
  notes: z.string().optional(),
}).passthrough();

// status must go through /:id/complete or /:id/cancel, which enforce the
// real business rules (e.g. balance must be zero before completing).
const updateRentalSchema = z.object({}).passthrough().refine(
  (data) => !('status' in data),
  { message: 'status cannot be changed via a generic update — use the /complete or /cancel endpoints.' }
);

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
 * /api/rentals/check-uniqueness:
 *   get:
 *     summary: Check if hardware or policy numbers are unique
 *     tags: [Rentals]
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: chassis_no
 *         schema: { type: string }
 *       - in: query
 *         name: motor_ctrl_no
 *         schema: { type: string }
 *       - in: query
 *         name: battery_no
 *         schema: { type: string }
 *       - in: query
 *         name: scooty_policy_number
 *         schema: { type: string }
 *       - in: query
 *         name: rider_policy_number
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Returns uniqueness status
 */
router.get('/check-uniqueness', rentalsController.checkUniqueness.bind(rentalsController));

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
