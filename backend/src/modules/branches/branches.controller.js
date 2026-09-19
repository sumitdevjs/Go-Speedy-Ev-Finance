const branchesService = require('./branches.service');
const { successResponse, errorResponse } = require('../../utils/response');

class BranchesController {
  async getAll(req, res) {
    try {
      const result = await branchesService.getAllBranches(req.query, req.user);
      return successResponse(res, 200, result.data, 'Branches retrieved successfully', result.meta);
    } catch (error) {
      console.error('[BranchesController.getAll]', error);
      return errorResponse(res, 500, error.message || 'Failed to fetch branches');
    }
  }

  async getDropdown(req, res) {
    try {
      const data = await branchesService.getDropdown(req.query, req.user);
      return successResponse(res, 200, data, 'Branches dropdown retrieved');
    } catch (error) {
      console.error('[BranchesController.getDropdown]', error);
      return errorResponse(res, 500, error.message || 'Failed to fetch dropdown');
    }
  }

  async getById(req, res) {
    try {
      const data = await branchesService.getById(req.params.id);
      return successResponse(res, 200, data, 'Branch details retrieved');
    } catch (error) {
      console.error('[BranchesController.getById]', error);
      return errorResponse(res, 404, error.message || 'Branch not found');
    }
  }

  async getOverview(req, res) {
    try {
      const data = await branchesService.getBranchOverview(req.params.id);
      return successResponse(res, 200, data, 'Branch overview retrieved');
    } catch (error) {
      console.error('[BranchesController.getOverview]', error);
      return errorResponse(res, 500, error.message || 'Failed to fetch branch overview');
    }
  }

  async create(req, res) {
    try {
      const { head_office_id, ward_no, name, code, ward_area, address, phone, contact_person, status_label } = req.body;
      if (!head_office_id || !name || !code) {
        return errorResponse(res, 400, 'head_office_id, name, and code are required');
      }
      const data = await branchesService.create({ head_office_id, ward_no, name, code, ward_area, address, phone, contact_person, status_label });
      return successResponse(res, 201, data, 'Branch created successfully');
    } catch (error) {
      console.error('[BranchesController.create]', error);
      return errorResponse(res, 400, error.message || 'Failed to create branch');
    }
  }

  async update(req, res) {
    try {
      const data = await branchesService.update(req.params.id, req.body);
      return successResponse(res, 200, data, 'Branch updated successfully');
    } catch (error) {
      console.error('[BranchesController.update]', error);
      return errorResponse(res, 400, error.message || 'Failed to update branch');
    }
  }
}

module.exports = new BranchesController();
