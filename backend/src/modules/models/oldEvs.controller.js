const oldEvsService = require('./oldEvs.service');
const { successResponse, errorResponse } = require('../../utils/response');

class OldEvsController {
  async getAvailable(req, res) {
    try {
      const data = await oldEvsService.getAvailableOldEvs();
      return successResponse(res, 200, data, 'Available old EVs retrieved');
    } catch (error) {
      console.error(error);
      return errorResponse(res, 500, 'Internal Server Error');
    }
  }

  async getAll(req, res) {
    try {
      const data = await oldEvsService.getAllOldEvs();
      return successResponse(res, 200, data, 'All old EVs retrieved');
    } catch (error) {
      console.error(error);
      return errorResponse(res, 500, 'Internal Server Error');
    }
  }

  async updatePrice(req, res) {
    try {
      const { id } = req.params;
      const { price } = req.body;
      
      if (price === undefined || price < 0) {
        return errorResponse(res, 400, 'Valid price is required');
      }

      const data = await oldEvsService.updateOldEvPrice(id, price);
      return successResponse(res, 200, data, 'Old EV price updated');
    } catch (error) {
      console.error(error);
      return errorResponse(res, 500, 'Internal Server Error');
    }
  }
}

module.exports = new OldEvsController();
