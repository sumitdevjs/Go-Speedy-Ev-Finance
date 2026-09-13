const modelsService = require('./models.service');
const { successResponse, errorResponse } = require('../../utils/response');

class ModelsController {
  async getAll(req, res) {
    try {
      const { data, meta } = await modelsService.getAllModels(req.query);
      return successResponse(res, 200, data, 'Models retrieved successfully', meta);
    } catch (error) {
      console.error(error);
      return errorResponse(res, 500, 'Internal Server Error');
    }
  }

  async getAllForDropdown(req, res) {
    try {
      const data = await modelsService.getAllModelsForDropdown();
      return successResponse(res, 200, data, 'Models retrieved successfully');
    } catch (error) {
      console.error(error);
      return errorResponse(res, 500, 'Internal Server Error');
    }
  }

  async getById(req, res) {
    try {
      const { id } = req.params;
      const data = await modelsService.getModelById(id);
      return successResponse(res, 200, data, 'Model retrieved successfully');
    } catch (error) {
      if (error.message === 'Model not found') {
        return errorResponse(res, 404, 'Model not found');
      }
      console.error(error);
      return errorResponse(res, 500, 'Internal Server Error');
    }
  }

  async create(req, res) {
    try {
      const data = await modelsService.createModel(req.body, req.user.id);
      return successResponse(res, 201, data, 'Model created successfully');
    } catch (error) {
      console.error(error);
      return errorResponse(res, 500, 'Internal Server Error');
    }
  }

  async update(req, res) {
    try {
      const { id } = req.params;
      const data = await modelsService.updateModel(id, req.body);
      return successResponse(res, 200, data, 'Model updated successfully');
    } catch (error) {
      if (error.message.startsWith('Cannot change price') || error.message.startsWith('Cannot deactivate')) {
        return errorResponse(res, 400, error.message);
      }
      console.error(error);
      return errorResponse(res, 500, 'Internal Server Error');
    }
  }

  async addStock(req, res) {
    try {
      const { id } = req.params;
      const data = await modelsService.addStock(id, req.body);
      return successResponse(res, 200, data, 'Stock added successfully');
    } catch (error) {
      console.error(error);
      return errorResponse(res, 500, 'Internal Server Error');
    }
  }
}

module.exports = new ModelsController();
