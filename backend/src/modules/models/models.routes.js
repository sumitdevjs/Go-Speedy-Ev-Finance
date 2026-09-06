const express = require('express');
const { z } = require('zod');
const modelsController = require('./models.controller');
const requireAuth = require('../../middleware/auth');
const requestLogger = require('../../middleware/requestLogger');

const router = express.Router();

router.use(requireAuth);

const createModelSchema = z.object({
  name: z.string().min(1),
  company: z.string().min(1),
  ward: z.string().min(1),
  total_price: z.number().positive(),
  stock_count: z.number().min(0).default(0),
});

const updateModelSchema = z.object({
  name: z.string().min(1).optional(),
  company: z.string().min(1).optional(),
  ward: z.string().min(1).optional(),
  total_price: z.number().positive().optional(),
  stock_count: z.number().min(0).optional(),
  is_active: z.boolean().optional(),
});

const validateBody = (schema) => (req, res, next) => {
  schema.parse(req.body);
  next();
};

/**
 * @openapi
 * /api/models:
 *   get:
 *     summary: List all EV models
 *     tags: [Models]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: List of models
 */
router.get('/', modelsController.getAll.bind(modelsController));

/**
 * @openapi
 * /api/models:
 *   post:
 *     summary: Create new EV model
 *     tags: [Models]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, company, ward, total_price]
 *             properties:
 *               name: { type: string }
 *               company: { type: string }
 *               ward: { type: string }
 *               total_price: { type: number }
 *               stock_count: { type: integer, default: 0 }
 *     responses:
 *       201:
 *         description: Created
 */
router.post(
  '/', 
  validateBody(createModelSchema), 
  requestLogger('ev_models', 'CREATE_MODEL'), 
  modelsController.create.bind(modelsController)
);

/**
 * @openapi
 * /api/models/{id}:
 *   patch:
 *     summary: Update EV model
 *     tags: [Models]
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
 *               company: { type: string }
 *               ward: { type: string }
 *               total_price: { type: number }
 *               stock_count: { type: integer }
 *               is_active: { type: boolean }
 *     responses:
 *       200:
 *         description: Updated
 *       400:
 *         description: Cannot change price with active rentals
 */
router.patch(
  '/:id', 
  validateBody(updateModelSchema), 
  requestLogger('ev_models', 'UPDATE_MODEL'), 
  modelsController.update.bind(modelsController)
);

module.exports = router;
