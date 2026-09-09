const express = require('express');
const { z } = require('zod');
const bookingsController = require('./bookings.controller');
const requireAuth = require('../../middleware/auth');
const requestLogger = require('../../middleware/requestLogger');

const router = express.Router();
router.use(requireAuth);

const createBookingSchema = z.object({
  ev_model_id: z.string().uuid().optional().nullable(),
  model_name_raw: z.string().optional().nullable(),
  name: z.string().min(1),
  phone: z.string().min(10),
  booking_amount: z.number().min(0).optional(),
  booking_date: z.string().optional(),
  notes: z.string().nullable().optional(),
});

const updateBookingSchema = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().min(10).optional(),
  ev_model_id: z.string().uuid().optional().nullable(),
  model_name_raw: z.string().optional().nullable(),
  booking_amount: z.number().min(0).optional(),
  notes: z.string().nullable().optional(),
});

const convertBookingSchema = z.object({
  ev_model_id: z.string().uuid().optional(),
  gender: z.enum(['male', 'female']),
}).passthrough(); // Needs all the tenant fields

const validateBody = (schema) => (req, res, next) => {
  schema.parse(req.body);
  next();
};

/**
 * @openapi
 * /api/bookings:
 *   get:
 *     summary: Get all pending bookings
 *     tags: [Bookings]
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *     responses:
 *       200:
 *         description: Paginated list of pending bookings
 */
router.get('/', bookingsController.getAll.bind(bookingsController));

/**
 * @openapi
 * /api/bookings:
 *   post:
 *     summary: Create new booking
 *     tags: [Bookings]
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
  validateBody(createBookingSchema), 
  requestLogger('bookings', 'CREATE_BOOKING'), 
  bookingsController.create.bind(bookingsController)
);

/**
 * @openapi
 * /api/bookings/{id}/convert:
 *   patch:
 *     summary: Convert a pending booking to an active rental
 *     tags: [Bookings]
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
 *         description: Converted successfully
 */
router.patch(
  '/:id/convert', 
  validateBody(convertBookingSchema), 
  requestLogger('bookings', 'CONVERT_BOOKING'), 
  bookingsController.convert.bind(bookingsController)
);

/**
 * @openapi
 * /api/bookings/{id}/cancel:
 *   patch:
 *     summary: Cancel a pending booking
 *     tags: [Bookings]
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
  requestLogger('bookings', 'CANCEL_BOOKING'), 
  bookingsController.cancel.bind(bookingsController)
);

/**
 * @openapi
 * /api/bookings/{id}:
 *   patch:
 *     summary: Update a booking details
 *     tags: [Bookings]
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
  validateBody(updateBookingSchema), 
  requestLogger('bookings', 'UPDATE_BOOKING'), 
  bookingsController.update.bind(bookingsController)
);

module.exports = router;
