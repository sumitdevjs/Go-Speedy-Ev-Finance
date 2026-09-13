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
  total_price: z.number().positive(),
  stock_count: z.number().min(0).default(0),
  initial_stock_date: z.string().optional(),
  // ward is extracted from payload and stored only in the initial stock log — not on the model row
  ward: z.string().optional(),
});

const stockLogSchema = z.object({
  id: z.string().uuid(),
  date: z.string(),
  stock_added: z.number(),
  ward_area: z.string()
});

const addStockSchema = z.object({
  date: z.string(),
  stock_added: z.number().int().positive(),
  ward_area: z.string().min(1)
});

const updateModelSchema = z.object({
  name: z.string().min(1).optional(),
  company: z.string().min(1).optional(),
  total_price: z.number().positive().optional(),
  stock_count: z.number().min(0).optional(),
  is_active: z.boolean().optional(),
  stock_logs: z.array(stockLogSchema).optional(),
});

const validateBody = (schema) => (req, res, next) => {
  schema.parse(req.body);
  next();
};

/**
 * @openapi
 * /api/models/dropdown:
 *   get:
 *     summary: List all EV models for dropdown selects (no pagination)
 *     tags: [Models]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Full list of models
 */
router.get('/dropdown', modelsController.getAllForDropdown.bind(modelsController));

/**
 * @openapi
 * /api/models:
 *   get:
 *     summary: List EV models (paginated)
 *     tags: [Models]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10 }
 *     responses:
 *       200:
 *         description: Paginated list of models
 */
router.get('/', modelsController.getAll.bind(modelsController));

/**
 * @openapi
 * /api/models/{id}:
 *   get:
 *     summary: Get single EV model
 *     tags: [Models]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Model details
 */
router.get('/:id', modelsController.getById.bind(modelsController));


/**
 * @openapi
 * /api/models:
 *   post:
 *     summary: Create new EV model
 *     tags: [Models]
 *     description: |
 *       Creates a new EV model. If `stock_count > 0` and `initial_stock_date` is provided,
 *       an initial stock log entry is automatically created. The optional `ward` field is
 *       stored **only** in that initial stock log — it is not a column on the model record itself.
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, company, total_price]
 *             properties:
 *               name:
 *                 type: string
 *                 example: Speedy Eco X1
 *               company:
 *                 type: string
 *                 example: Go Speedy EV Motors
 *               total_price:
 *                 type: number
 *                 example: 80000
 *               stock_count:
 *                 type: integer
 *                 default: 0
 *                 example: 5
 *               initial_stock_date:
 *                 type: string
 *                 format: date
 *                 description: Required when stock_count > 0
 *                 example: "2026-09-13"
 *               ward:
 *                 type: string
 *                 description: Hub/depot name — saved only inside the initial stock log entry
 *                 example: Okhla Depot
 *     responses:
 *       201:
 *         description: EV model created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
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
 *     description: |
 *       Updates an EV model's details. Changing `total_price` or setting `is_active` to `false`
 *       is blocked if there are currently active rentals for this model.
 *       Note: `ward` is no longer a field on the model — use the `/stock` endpoint to log ward with stock additions.
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: Speedy Eco X2
 *               company:
 *                 type: string
 *                 example: Go Speedy EV Motors
 *               total_price:
 *                 type: number
 *                 example: 85000
 *               stock_count:
 *                 type: integer
 *                 example: 10
 *               is_active:
 *                 type: boolean
 *                 example: false
 *     responses:
 *       200:
 *         description: Model updated successfully
 *       400:
 *         description: Cannot change price or deactivate with active rentals
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Model not found
 */
router.patch(
  '/:id', 
  validateBody(updateModelSchema), 
  requestLogger('ev_models', 'UPDATE_MODEL'), 
  modelsController.update.bind(modelsController)
);

/**
 * @openapi
 * /api/models/{id}/stock:
 *   post:
 *     summary: Add stock to EV model
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
 *             required: [date, stock_added, ward_area]
 *             properties:
 *               date: { type: string }
 *               stock_added: { type: integer }
 *               ward_area: { type: string }
 *     responses:
 *       200:
 *         description: Stock added
 */
router.post(
  '/:id/stock',
  validateBody(addStockSchema),
  requestLogger('ev_models', 'ADD_STOCK'),
  modelsController.addStock.bind(modelsController)
);

module.exports = router;
