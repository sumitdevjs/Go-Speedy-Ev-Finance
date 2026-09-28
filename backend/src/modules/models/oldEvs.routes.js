const express = require('express');
const oldEvsController = require('./oldEvs.controller');
const requireAuth = require('../../middleware/auth');

const router = express.Router();

router.use(requireAuth);

router.get('/available', oldEvsController.getAvailable.bind(oldEvsController));
router.get('/', oldEvsController.getAll.bind(oldEvsController));
router.patch('/:id/price', oldEvsController.updatePrice.bind(oldEvsController));

module.exports = router;
