const headOfficesService = require('./headOffices.service');
const { successResponse, errorResponse } = require('../../utils/response');

class HeadOfficesController {
  async getAll(req, res) {
    try {
      const data = await headOfficesService.getAllHeadOffices();
      return successResponse(res, 200, data, 'Head offices retrieved successfully');
    } catch (error) {
      console.error('[HeadOfficesController.getAll]', error);
      return errorResponse(res, 500, error.message || 'Failed to fetch head offices');
    }
  }

  async getDropdown(req, res) {
    try {
      const data = await headOfficesService.getDropdown();
      return successResponse(res, 200, data, 'Head offices dropdown retrieved');
    } catch (error) {
      console.error('[HeadOfficesController.getDropdown]', error);
      return errorResponse(res, 500, error.message || 'Failed to fetch dropdown');
    }
  }

  async getById(req, res) {
    try {
      const data = await headOfficesService.getById(req.params.id);
      return successResponse(res, 200, data, 'Head office details retrieved');
    } catch (error) {
      console.error('[HeadOfficesController.getById]', error);
      return errorResponse(res, 404, error.message || 'Head office not found');
    }
  }

  async create(req, res) {
    try {
      const { name, code, city, state } = req.body;
      if (!name || !code || !city || !state) {
        return errorResponse(res, 400, 'Name, code, city, and state are required');
      }
      const data = await headOfficesService.create({ name, code, city, state });
      return successResponse(res, 201, data, 'Head office created successfully');
    } catch (error) {
      console.error('[HeadOfficesController.create]', error);
      return errorResponse(res, 400, error.message || 'Failed to create head office');
    }
  }

  async update(req, res) {
    try {
      const data = await headOfficesService.update(req.params.id, req.body);
      return successResponse(res, 200, data, 'Head office updated successfully');
    } catch (error) {
      console.error('[HeadOfficesController.update]', error);
      return errorResponse(res, 400, error.message || 'Failed to update head office');
    }
  }

  async getDashboard(req, res) {
    try {
      const hoId = req.params.id || req.user?.head_office_id;
      const data = await headOfficesService.getHeadOfficeDashboard(hoId, req.user);
      return successResponse(res, 200, data, 'Head office dashboard data retrieved successfully');
    } catch (error) {
      console.error('[HeadOfficesController.getDashboard]', error);
      return errorResponse(res, 500, error.message || 'Failed to fetch dashboard data');
    }
  }
}

module.exports = new HeadOfficesController();
