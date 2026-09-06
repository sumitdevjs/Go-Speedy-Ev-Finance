const auditService = require('./audit.service');
const { successResponse, errorResponse } = require('../../utils/response');

class AuditController {
  async getAll(req, res) {
    try {
      const { data, meta } = await auditService.getLogs(req.query);
      return successResponse(res, 200, data, 'Audit logs retrieved successfully', meta);
    } catch (error) {
      console.error(error);
      return errorResponse(res, 500, 'Internal Server Error');
    }
  }
}

module.exports = new AuditController();
