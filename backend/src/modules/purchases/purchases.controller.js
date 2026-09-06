const purchasesService = require('./purchases.service');
const { successResponse, errorResponse } = require('../../utils/response');

class PurchasesController {
  async getAll(req, res) {
    try {
      const { data, meta } = await purchasesService.getPurchases(req.query);
      return successResponse(res, 200, data, 'Purchases retrieved successfully', meta);
    } catch (error) {
      console.error(error);
      return errorResponse(res, 500, 'Internal Server Error');
    }
  }
}

module.exports = new PurchasesController();
