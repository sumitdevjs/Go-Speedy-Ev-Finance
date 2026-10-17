const express = require('express');
const { z } = require('zod');
const requireAuth = require('../../middleware/auth');
const { requireRole } = require('../../middleware/roleGuard');
const penaltiesController = require('./penalties.controller');
const requestLogger = require('../../middleware/requestLogger');

const router = express.Router();
router.use(requireAuth);

const createPenaltySchema = z.object({
  tenant_id: z.string().uuid(),
  amount: z.number().positive(),
  reason: z.string().min(2),
  notes: z.string().optional().nullable(),
  penalty_date: z.string().optional()
});

const validateBody = (schema) => (req, res, next) => {
  schema.parse(req.body);
  next();
};

// All authenticated users can query penalties (scoped)
router.get('/', penaltiesController.getAll.bind(penaltiesController));
router.get('/tenant/:tenantId', penaltiesController.getTenantPenalties.bind(penaltiesController));

// Super Admin / HO Admin / Admin can add penalty (unlimited amount)
router.post(
  '/',
  requireRole('super_admin', 'ho_admin', 'admin'),
  validateBody(createPenaltySchema),
  requestLogger('penalties', 'CREATE_PENALTY'),
  penaltiesController.create.bind(penaltiesController)
);

// Super Admin / Admin can waive penalty
router.post(
  '/:id/waive',
  requireRole('super_admin', 'ho_admin', 'admin'),
  requestLogger('penalties', 'WAIVE_PENALTY'),
  penaltiesController.waive.bind(penaltiesController)
);

module.exports = router;
