const { errorResponse } = require('../utils/response');

const requireRole = (...roles) => {
  // Support both requireRole('admin', 'staff') and requireRole(['admin', 'staff'])
  const allowedRoles = Array.isArray(roles[0]) ? roles[0] : roles;

  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return errorResponse(res, 401, 'Unauthorized - No user role found');
    }

    const userRole = req.user.role;
    // super_admin always has access if 'admin' is allowed
    const hasPermission = allowedRoles.includes(userRole) || 
      (allowedRoles.includes('admin') && userRole === 'super_admin');

    if (!hasPermission) {
      return errorResponse(res, 403, `Forbidden - Role '${userRole}' does not have sufficient permissions`);
    }

    next();
  };
};

// Common usage helpers
const requireSuperAdmin = requireRole('super_admin', 'admin');
const requireHoAdmin = requireRole('super_admin', 'ho_admin', 'admin');
const requireBranchAdmin = requireRole('super_admin', 'ho_admin', 'branch_admin', 'admin');
const requireAdmin = requireRole('super_admin', 'admin');
const requireStaffOrAdmin = requireRole('super_admin', 'ho_admin', 'branch_admin', 'admin', 'staff');

module.exports = {
  requireRole,
  requireSuperAdmin,
  requireHoAdmin,
  requireBranchAdmin,
  requireAdmin,
  requireStaffOrAdmin,
};
