const express = require('express');
const auditController = require('./audit.controller');
const requireAuth = require('../../middleware/auth');
const { requireAdmin } = require('../../middleware/roleGuard');

const router = express.Router();

// Only Admins can view audit logs
router.use(requireAuth);
router.use(requireAdmin);

/**
 * @openapi
 * /api/audit:
 *   get:
 *     summary: Get audit logs (Admin only)
 *     tags: [Audit]
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: user_id
 *         schema: { type: string }
 *       - in: query
 *         name: action
 *         schema: { type: string }
 *       - in: query
 *         name: entity_type
 *         schema: { type: string }
 *       - in: query
 *         name: from
 *         schema: { type: string }
 *       - in: query
 *         name: to
 *         schema: { type: string }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *     responses:
 *       200:
 *         description: List of audit logs
 */
router.get('/', auditController.getAll.bind(auditController));

module.exports = router;
