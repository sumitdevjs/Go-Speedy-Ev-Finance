const rentalsService = require('./rentals.service');
const { successResponse, errorResponse } = require('../../utils/response');

class RentalsController {
  async getAll(req, res) {
    try {
      const { data, meta } = await rentalsService.getRentals(req.query);
      return successResponse(res, 200, data, 'Rentals retrieved', meta);
    } catch (error) {
      console.error(error);
      return errorResponse(res, 500, 'Internal Server Error');
    }
  }

  async getById(req, res) {
    try {
      const { id } = req.params;
      const data = await rentalsService.getRentalById(id);
      return successResponse(res, 200, data, 'Rental details retrieved');
    } catch (error) {
      if (error.message === 'Rental not found') return errorResponse(res, 404, error.message);
      console.error(error);
      return errorResponse(res, 500, 'Internal Server Error');
    }
  }

  async create(req, res, next) {
    try {
      const data = await rentalsService.createRental(req.body, req.user.id);
      return successResponse(res, 201, data, 'Rental created successfully');
    } catch (error) {
      if (error.message.includes('out of stock') || error.message.includes('Unique constraint violation')) {
        return errorResponse(res, 409, error.message);
      }
      next(error);
    }
  }

  async update(req, res) {
    try {
      const { id } = req.params;
      const data = await rentalsService.updateRental(id, req.body);
      return successResponse(res, 200, data, 'Rental updated successfully');
    } catch (error) {
      if (error.message.includes('Unique constraint violation')) {
        return errorResponse(res, 409, error.message);
      }
      console.error(error);
      return errorResponse(res, 500, 'Internal Server Error');
    }
  }

  async cancel(req, res) {
    try {
      const { id } = req.params;
      await rentalsService.cancelRental(id);
      return successResponse(res, 200, null, 'Rental cancelled successfully');
    } catch (error) {
      if (error.message.includes('already cancelled') || error.message.includes('Only active')) {
        return errorResponse(res, 400, error.message);
      }
      console.error(error);
      return errorResponse(res, 500, 'Internal Server Error');
    }
  }

  async complete(req, res) {
    try {
      const { id } = req.params;
      const data = await rentalsService.completeRental(id);
      return successResponse(res, 200, data, 'Rental completed successfully');
    } catch (error) {
      if (error.message.startsWith('Cannot complete') || error.message.includes('not currently active')) {
        return errorResponse(res, 400, error.message);
      }
      console.error(error);
      return errorResponse(res, 500, 'Internal Server Error');
    }
  }

  async checkUniqueness(req, res) {
    try {
      const data = await rentalsService.checkUniqueHardwareOrPolicy(req.query);
      return successResponse(res, 200, data, 'Uniqueness check completed');
    } catch (error) {
      console.error(error);
      return errorResponse(res, 500, 'Internal Server Error');
    }
  }
}

module.exports = new RentalsController();
