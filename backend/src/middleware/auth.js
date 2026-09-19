const { verifyAccessToken } = require('../utils/jwt');
const { errorResponse } = require('../utils/response');
const supabase = require('../config/db');

const requireAuth = async (req, res, next) => {
  try {
    // We expect the access_token in a cookie
    const token = req.cookies?.access_token;
    
    if (!token) {
      return errorResponse(res, 401, 'Unauthorized - No token provided');
    }

    const decoded = verifyAccessToken(token);
    
    if (!decoded || !decoded.id) {
      return errorResponse(res, 401, 'Unauthorized - Invalid or expired token');
    }

    // Verify user is still active
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

    // Attach user to request
    req.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      head_office_id: user.head_office_id,
      branch_id: user.branch_id,
    };
    
    next();
  } catch (error) {
    console.error('[Auth Middleware Error]', error);
    return errorResponse(res, 500, 'Internal Server Error during authentication');
  }
};

module.exports = requireAuth;
