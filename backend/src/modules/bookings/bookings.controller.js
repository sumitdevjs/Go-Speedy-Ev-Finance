const bookingsService = require('./bookings.service');
const { successResponse, errorResponse } = require('../../utils/response');

class BookingsController {
  async getAll(req, res) {
    try {
      const { data, meta } = await bookingsService.getBookings(req.query);
      return successResponse(res, 200, data, 'Bookings retrieved successfully', meta);
    } catch (error) {
      console.error(error);
      return errorResponse(res, 500, 'Internal Server Error');
    }
  }

  async create(req, res) {
    try {
      const data = await bookingsService.createBooking(req.body, req.user.id);
      return successResponse(res, 201, data, 'Booking created successfully');
    } catch (error) {
      console.error(error);
      return errorResponse(res, 500, 'Internal Server Error');
    }
  }

  async convert(req, res) {
    try {
      const { id } = req.params;
      const data = await bookingsService.convertBooking(id, req.body, req.user.id);
      return successResponse(res, 200, data, 'Booking converted to rental successfully');
    } catch (error) {
      if (error.message.startsWith('Booking status is') || error.message.includes('ev_model_id is required') || error.message.includes('out of stock') || error.message.includes('Unique constraint violation')) {
        return errorResponse(res, 400, error.message);
      }
      console.error(error);
      return errorResponse(res, 500, 'Internal Server Error');
    }
  }

  async cancel(req, res) {
    try {
      const { id } = req.params;
      const data = await bookingsService.cancelBooking(id);
      return successResponse(res, 200, data, 'Booking cancelled successfully');
    } catch (error) {
      if (error.message.includes('not pending')) {
        return errorResponse(res, 400, error.message);
      }
      console.error(error);
      return errorResponse(res, 500, 'Internal Server Error');
    }
  }

  async update(req, res) {
    try {
      const { id } = req.params;
      const data = await bookingsService.updateBooking(id, req.body);
      return successResponse(res, 200, data, 'Booking updated successfully');
    } catch (error) {
      if (error.message === 'Booking not found') {
        return errorResponse(res, 404, error.message);
      }
      console.error(error);
      return errorResponse(res, 500, 'Internal Server Error');
    }
  }
}

module.exports = new BookingsController();
