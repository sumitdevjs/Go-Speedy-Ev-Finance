const staffService = require('./staff.service');
const { successResponse, errorResponse } = require('../../utils/response');

class StaffController {
  async getAll(req, res) {
    try {
      const data = await staffService.getAllStaff();
      return successResponse(res, 200, data, 'Staff retrieved successfully');
    } catch (error) {
      console.error(error);
      return errorResponse(res, 500, 'Internal Server Error');
    }
  }

  async create(req, res) {
    try {
      const data = await staffService.createStaff(req.body, req.user.id);
      return successResponse(res, 201, data, 'Staff created successfully');
    } catch (error) {
      if (error.message === 'Phone or email already exists') {
        return errorResponse(res, 409, error.message);
      }
      console.error(error);
      return errorResponse(res, 500, 'Internal Server Error');
    }
  }

  async update(req, res) {
    try {
      const { id } = req.params;
      const data = await staffService.updateStaff(id, req.body);
      return successResponse(res, 200, data, 'Staff updated successfully');
    } catch (error) {
      if (error.message === 'Phone or email already exists') {
        return errorResponse(res, 409, error.message);
      }
      console.error(error);
      return errorResponse(res, 500, 'Internal Server Error');
    }
  }

  async changePassword(req, res) {
    try {
      const { id } = req.params;
      const { password } = req.body;
      await staffService.changePassword(id, password);
      return successResponse(res, 200, null, 'Password updated successfully');
    } catch (error) {
      console.error(error);
      return errorResponse(res, 500, 'Internal Server Error');
    }
  }

  async toggleActive(req, res) {
    try {
      const { id } = req.params;
      const { is_active } = req.body;
      const data = await staffService.toggleActive(id, is_active, req.user.id);
      return successResponse(res, 200, data, `Staff account ${is_active ? 'activated' : 'deactivated'}`);
    } catch (error) {
      if (error.message === 'Cannot deactivate yourself') {
        return errorResponse(res, 403, error.message);
      }
      console.error(error);
      return errorResponse(res, 500, 'Internal Server Error');
    }
  }
}

module.exports = new StaffController();
