const express = require('express');
const branchesController = require('./branches.controller');
const requireAuth = require('../../middleware/auth');
const requireRole = require('../../middleware/role');

const router = express.Router();

router.use(requireAuth);

// Anyone authenticated can access dropdown (e.g. staff selection, header filters)
router.get('/dropdown', branchesController.getDropdown.bind(branchesController));

// Branch dashboard — branch_admin gets their own ward's full dashboard
router.get('/my-dashboard', branchesController.getMyDashboard.bind(branchesController));

// Branch overview (lightweight)
router.get('/:id/overview', branchesController.getOverview.bind(branchesController));

// Full dashboard for a specific branch (super_admin / admin access)
router.get('/:id/dashboard', branchesController.getDashboardById.bind(branchesController));

// Listing and details
router.get('/', branchesController.getAll.bind(branchesController));
router.get('/:id', branchesController.getById.bind(branchesController));

// Super admin and HO admin can create / update branches
router.post('/', requireRole('super_admin', 'ho_admin', 'admin'), branchesController.create.bind(branchesController));
router.patch('/:id', requireRole('super_admin', 'ho_admin', 'admin'), branchesController.update.bind(branchesController));

module.exports = router;
