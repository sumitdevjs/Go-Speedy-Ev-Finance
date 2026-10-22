const express = require('express');
const requireAuth = require('../../middleware/auth');
const customersController = require('./customers.controller');

const router = express.Router();
router.use(requireAuth);

router.get('/', customersController.getAll.bind(customersController));
router.get('/:id', customersController.getDetails.bind(customersController));

module.exports = router;
