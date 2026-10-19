const express = require('express');
const requireAuth = require('../../middleware/auth');
const { requireBranchAdmin } = require('../../middleware/roleGuard');
const reportsController = require('./reports.controller');

const router = express.Router();
router.use(requireAuth);
router.use(requireBranchAdmin);

router.get('/collections', reportsController.getCollections.bind(reportsController));
router.get('/overdue', reportsController.getOverdue.bind(reportsController));
router.get('/sales', reportsController.getSales.bind(reportsController));

module.exports = router;
