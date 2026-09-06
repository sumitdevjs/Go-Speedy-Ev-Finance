const documentsService = require('./documents.service');
const { successResponse, errorResponse } = require('../../utils/response');

class DocumentsController {
  async getForTenant(req, res) {
    try {
      const { tenantId } = req.params;
      const data = await documentsService.getDocumentsForTenant(tenantId);
      return successResponse(res, 200, data, 'Documents retrieved successfully');
    } catch (error) {
      if (error.message === 'Tenant not found') {
        return errorResponse(res, 404, error.message);
      }
      console.error(error);
      return errorResponse(res, 500, 'Internal Server Error');
    }
  }

  async upload(req, res) {
    try {
      if (!req.file) {
        return errorResponse(res, 400, 'No file uploaded');
      }

      const { tenant_id, doc_type } = req.body;
      
      const allowedDocTypes = [
        'aadhar_path', 'pan_path', 'cheque_path', 
        'electricity_bill_path', 'tenant_photo_path', 'scooty_photo_path'
      ];

      if (!allowedDocTypes.includes(doc_type)) {
        return errorResponse(res, 400, `Invalid doc_type. Must be one of ${allowedDocTypes.join(', ')}`);
      }

      const data = await documentsService.uploadDocument(
        tenant_id, 
        doc_type, 
        req.file.buffer, 
        req.file.mimetype
      );

      return successResponse(res, 201, data, 'Document uploaded successfully');
    } catch (error) {
      console.error(error);
      return errorResponse(res, 500, 'Internal Server Error');
    }
  }
}

module.exports = new DocumentsController();
