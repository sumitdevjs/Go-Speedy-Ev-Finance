const { errorResponse } = require('../utils/response');

const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return errorResponse(res, 401, 'Unauthorized - No user role found');
    }

    if (!allowedRoles.includes(req.user.role)) {
      return errorResponse(res, 403, 'Forbidden - Insufficient permissions');
    }

    next();
  };
};

// Common usage helpers
const requireAdmin = requireRole(['admin']);
const requireStaffOrAdmin = requireRole(['admin', 'staff']);

module.exports = {
  requireRole,
  requireAdmin,
  requireStaffOrAdmin
};
