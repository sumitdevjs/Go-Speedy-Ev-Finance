const transfersService = require('./transfers.service');

class TransfersController {
  async getAll(req, res, next) {
    try {
      const data = await transfersService.getTransfers(req.query, req);
      res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async initiate(req, res, next) {
    try {
      const data = await transfersService.initiateTransfer(req.body, req.user);
      res.status(201).json({ success: true, message: 'Stock transfer initiated', data });
    } catch (err) {
      next(err);
    }
  }

  async dispatch(req, res, next) {
    try {
      const { id } = req.params;
      const data = await transfersService.dispatchTransfer(id, req.body, req.user);
      res.status(200).json({ success: true, message: 'Stock dispatched in-transit', data });
    } catch (err) {
      next(err);
    }
  }

  async receive(req, res, next) {
    try {
      const { id } = req.params;
      const data = await transfersService.receiveTransfer(id, req.body, req.user);
      res.status(200).json({ success: true, message: 'Stock received and inventory updated', data });
    } catch (err) {
      next(err);
    }
  }

  async cancel(req, res, next) {
    try {
      const { id } = req.params;
      const data = await transfersService.cancelTransfer(id, req.body, req.user);
      res.status(200).json({ success: true, message: 'Transfer cancelled', data });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new TransfersController();
