const { verifyAccessToken } = require('../utils/jwt');
const { errorResponse } = require('../utils/response');
const supabase = require('../config/db');

const requireAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers?.authorization;
    const token = req.cookies?.access_token || (authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null);
    
    if (!token) {
      return errorResponse(res, 401, 'Unauthorized - No token provided');
    }

    const decoded = verifyAccessToken(token);
    
    if (!decoded || !decoded.id) {
      return errorResponse(res, 401, 'Unauthorized - Invalid or expired token');
    }

    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', decoded.id)
      .single();

    if (error || !user) {
      return errorResponse(res, 401, 'Unauthorized - User not found');
    }

    if (!user.is_active) {
      return errorResponse(res, 401, 'Unauthorized - Account is deactivated');
    }

    if ((decoded.auth_version || 0) !== (user.auth_version || 0)) {
      return errorResponse(res, 401, 'Session revoked. Please log in again.');
    }

    // Prevent ambiguous escalation: legacy 'admin' with head_office_id or branch_id is never super_admin
    const hasBranch = Boolean(user.branch_id || (user.ward_area && !['ALL', 'HQ', 'Delhi / Ncr', 'Delhi/NCR', 'Delhi'].includes(user.ward_area)));
    const hasHO = Boolean(user.head_office_id);
    const isMasterAdmin = user.role === 'super_admin' || (user.role === 'admin' && !hasHO && !hasBranch);

    let effectiveRole = isMasterAdmin ? 'super_admin' : user.role;
    if (!isMasterAdmin) {
      if (user.role === 'branch_admin' || (user.role === 'admin' && hasBranch)) {
        effectiveRole = 'branch_admin';
      } else if (user.role === 'ho_admin' || (user.role === 'admin' && hasHO)) {
        effectiveRole = 'ho_admin';
      }
    }
    const branchId = isMasterAdmin ? null : (user.branch_id || user.ward_area);

    req.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: effectiveRole,
      head_office_id: user.head_office_id,
      branch_id: branchId,
      ward_area: user.ward_area,
    };
    
    next();
  } catch (error) {
    console.error('[Auth Middleware Error]', error);
    return errorResponse(res, 500, 'Internal Server Error during authentication');
  }
};

module.exports = requireAuth;
