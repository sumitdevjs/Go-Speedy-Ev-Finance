const staffService = require('./staff.service');
const { successResponse, errorResponse } = require('../../utils/response');
const { logAudit } = require('../../utils/auditLog');

const clientIp = (req) => req.ip || req.headers['x-forwarded-for'];

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
      await logAudit({
        userId: req.user.id,
        userRole: req.user.role,
        action: 'CREATE_STAFF',
        entityType: 'users',
        entityId: data.id,
        changes: { name: data.name, phone: data.phone, email: data.email, role: data.role },
        ip: clientIp(req),
      });
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
      const { data, diff } = await staffService.updateStaff(id, req.body, req.user.id);
      await logAudit({
        userId: req.user.id,
        userRole: req.user.role,
        action: 'UPDATE_STAFF',
        entityType: 'users',
        entityId: id,
        changes: diff,
        ip: clientIp(req),
      });
      return successResponse(res, 200, data, 'Staff updated successfully');
    } catch (error) {
      if (error.message === 'Phone or email already exists') {
        return errorResponse(res, 409, error.message);
      }
      if (error.message === 'Cannot change your own role') {
        return errorResponse(res, 403, error.message);
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
      // Never log the password itself (hashed or not) — just record that a reset happened.
      await logAudit({
        userId: req.user.id,
        userRole: req.user.role,
        action: 'CHANGE_PASSWORD',
        entityType: 'users',
        entityId: id,
        changes: { password: 'Reset by admin' },
        ip: clientIp(req),
      });
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
      const { data, diff } = await staffService.toggleActive(id, is_active, req.user.id);
      await logAudit({
        userId: req.user.id,
        userRole: req.user.role,
        action: is_active ? 'ACTIVATE_STAFF' : 'DEACTIVATE_STAFF',
        entityType: 'users',
        entityId: id,
        changes: diff,
        ip: clientIp(req),
      });
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
