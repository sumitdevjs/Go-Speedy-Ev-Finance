const express = require('express');
const purchasesController = require('./purchases.controller');
const requireAuth = require('../../middleware/auth');

const router = express.Router();
router.use(requireAuth);

/**
 * @openapi
 * /api/purchases:
 *   get:
 *     summary: Get completed rentals and direct purchases
 *     tags: [Purchases]
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
 *         description: List of purchases
 */
router.get('/', purchasesController.getAll.bind(purchasesController));

module.exports = router;
