const express = require('express');
const branchesController = require('./branches.controller');
const requireAuth = require('../../middleware/auth');
const requireRole = require('../../middleware/role');

const router = express.Router();

router.use(requireAuth);

// Anyone authenticated can access dropdown (e.g. staff selection, header filters)
router.get('/dropdown', branchesController.getDropdown.bind(branchesController));

// Branch overview
router.get('/:id/overview', branchesController.getOverview.bind(branchesController));

// Listing and details
router.get('/', branchesController.getAll.bind(branchesController));
router.get('/:id', branchesController.getById.bind(branchesController));

// Super admin and HO admin can create / update branches
router.post('/', requireRole('super_admin', 'ho_admin', 'admin'), branchesController.create.bind(branchesController));
router.patch('/:id', requireRole('super_admin', 'ho_admin', 'admin'), branchesController.update.bind(branchesController));

module.exports = router;
