const express = require('express');
const requireAuth = require('../../middleware/auth');
const transfersController = require('./transfers.controller');

const router = express.Router();
router.use(requireAuth);

router.get('/', transfersController.getAll.bind(transfersController));
router.post('/', transfersController.initiate.bind(transfersController));
router.post('/:id/dispatch', transfersController.dispatch.bind(transfersController));
router.post('/:id/receive', transfersController.receive.bind(transfersController));
router.post('/:id/cancel', transfersController.cancel.bind(transfersController));

module.exports = router;
