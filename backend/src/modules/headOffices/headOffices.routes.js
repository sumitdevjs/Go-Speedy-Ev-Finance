const express = require('express');
const headOfficesController = require('./headOffices.controller');
const requireAuth = require('../../middleware/auth');
const requireRole = require('../../middleware/role');

const router = express.Router();

router.use(requireAuth);

// Anyone authenticated can get the dropdown for filtering/assignment
router.get('/dropdown', headOfficesController.getDropdown.bind(headOfficesController));

// Head Office Dashboard for HO Admin and Super Admin
router.get('/my-dashboard', requireRole('super_admin', 'ho_admin', 'admin'), headOfficesController.getDashboard.bind(headOfficesController));
router.get('/:id/dashboard', requireRole('super_admin', 'ho_admin', 'admin'), headOfficesController.getDashboard.bind(headOfficesController));

// Super admin and HO admin can view all
router.get('/', requireRole('super_admin', 'ho_admin', 'admin'), headOfficesController.getAll.bind(headOfficesController));
router.get('/:id', requireRole('super_admin', 'ho_admin', 'admin'), headOfficesController.getById.bind(headOfficesController));

// Only Super Admin can create or update HOs
router.post('/', requireRole('super_admin', 'admin'), headOfficesController.create.bind(headOfficesController));
router.patch('/:id', requireRole('super_admin', 'admin'), headOfficesController.update.bind(headOfficesController));

module.exports = router;
