const paymentsService = require('./payments.service');
const { successResponse, errorResponse } = require('../../utils/response');

class PaymentsController {
  async getAll(req, res) {
    try {
      const { tenant_id } = req.query;
      const data = await paymentsService.getPayments(tenant_id);
      return successResponse(res, 200, data, 'Payments retrieved successfully');
    } catch (error) {
      console.error(error);
      return errorResponse(res, 500, 'Internal Server Error');
    }
  }

  async record(req, res) {
    try {
      const data = await paymentsService.recordPayment(req.body, req.user.id);
      return successResponse(res, 201, data, 'Payment recorded successfully');
    } catch (error) {
      if (error.message.startsWith('Cannot record payment') || error.message === 'Tenant not found') {
        return errorResponse(res, 400, error.message);
      }
      console.error(error);
      return errorResponse(res, 500, 'Internal Server Error');
    }
  }
}

module.exports = new PaymentsController();
