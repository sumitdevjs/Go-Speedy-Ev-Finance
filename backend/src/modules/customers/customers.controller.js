const customersService = require('./customers.service');

class CustomersController {
  async getAll(req, res, next) {
    try {
      const result = await customersService.getCustomers(req.query, req);
      res.status(200).json({
        success: true,
        data: result.data,
        summary: result.summary
      });
    } catch (err) {
      next(err);
    }
  }

  async getDetails(req, res, next) {
    try {
      const { id } = req.params;
      const result = await customersService.getCustomerDetails(id);
      res.status(200).json({
        success: true,
        data: result
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new CustomersController();
