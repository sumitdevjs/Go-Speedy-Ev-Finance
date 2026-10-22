const authService = require('./auth.service');
const supabase = require('../../config/db');
const { successResponse, errorResponse } = require('../../utils/response');

class AuthController {
  async login(req, res) {
    try {
      const { email, password } = req.body;
      const result = await authService.login(email, password);

      this._setCookies(req, res, result.accessToken, result.refreshToken, result.user.id);

      return successResponse(res, 200, { user: result.user, token: result.accessToken }, 'Login successful');
    } catch (error) {
      const status = error.message?.includes('deactivated') ? 403 : 401;
      return errorResponse(res, status, error.message || 'Invalid credentials');
    }
  }

  async refresh(req, res) {
    try {
      const refreshToken = req.cookies?.refresh_token;
      const userId = req.cookies?.user_id;

      if (!refreshToken || !userId) {
        return errorResponse(res, 401, 'Unauthorized');
      }

      const result = await authService.refresh(refreshToken, userId);

      this._setCookies(req, res, result.accessToken, result.refreshToken, result.user.id);

      return successResponse(res, 200, { user: result.user, token: result.accessToken }, 'Token refreshed');
    } catch (error) {
      console.warn(`[Auth] Refresh failed (${error.message || 'Unauthorized'}). Session cleared.`);
      this._clearCookies(req, res);
      return errorResponse(res, 401, 'Session expired or invalid. Please log in again.');
    }
  }

  async logout(req, res) {
    try {
      if (req.user && req.user.id) {
        await authService.logout(req.user.id);
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      this._clearCookies(req, res);
      return successResponse(res, 200, null, 'Logged out successfully');
    }
  }

  async me(req, res) {
    try {
      let branch = null;
      let headOffice = null;

      const isSuperAdmin = req.user?.role === 'super_admin' || (req.user?.role === 'admin' && !req.user?.ward_area);
      const branchRef = !isSuperAdmin ? (req.user?.branch_id || req.user?.ward_area) : null;
      if (branchRef) {
        try {
          const branchesService = require('../branches/branches.service');
          branch = await branchesService.getById(branchRef);
        } catch (e) {}
      }

      const hoRef = req.user?.head_office_id || branch?.head_office_id;
      if (hoRef) {
        try {
          const headOfficesService = require('../headOffices/headOffices.service');
          headOffice = await headOfficesService.getById(hoRef);
        } catch (e) {}
      }

      return successResponse(res, 200, {
        user: {
          ...req.user,
          branch,
          head_office: headOffice,
        },
      }, 'User profile retrieved');
    } catch (err) {
      return successResponse(res, 200, { user: req.user }, 'User profile retrieved');
    }
  }

  async forgotPassword(req, res) {
    try {
      const { email } = req.body;
      const result = await authService.requestPasswordReset(email);
      return successResponse(res, 200, null, result.message);
    } catch (error) {
      const status = error.message.includes('deactivated') ? 403 : 400;
      return errorResponse(res, status, error.message);
    }
  }

  async resetPassword(req, res) {
    try {
      const { email, otp, newPassword } = req.body;
      const ip = req.ip || req.headers['x-forwarded-for'];
      const result = await authService.resetPasswordWithOtp(email, otp, newPassword, ip);
      return successResponse(res, 200, null, result.message);
    } catch (error) {
      return errorResponse(res, 400, error.message);
    }
  }

  async updateProfile(req, res) {
    try {
      if (req.user?.role !== 'super_admin' && req.user?.role !== 'admin') {
        return errorResponse(res, 403, 'Access denied: Only Super Admin can change their own credentials.');
      }
      const ip = req.ip || req.headers['x-forwarded-for'];
      const updatedUser = await authService.updateSelfProfile(req.user.id, req.body, ip);
      return successResponse(res, 200, { user: updatedUser }, 'Profile updated successfully');
    } catch (error) {
      return errorResponse(res, 400, error.message);
    }
  }

  async changePassword(req, res) {
    try {
      if (req.user?.role !== 'super_admin' && req.user?.role !== 'admin') {
        return errorResponse(res, 403, 'Access denied: Only Super Admin can change their own password.');
      }
      const ip = req.ip || req.headers['x-forwarded-for'];
      const result = await authService.changeSelfPassword(req.user.id, req.body, ip);
      return successResponse(res, 200, null, result.message);
    } catch (error) {
      return errorResponse(res, 400, error.message);
    }
  }

  _getCookieOpts(req) {
    const isHttps = Boolean(req && (req.secure || req.headers?.['x-forwarded-proto'] === 'https'));
    return {
      httpOnly: true,
      secure: isHttps,
      sameSite: isHttps ? 'none' : 'lax',
      path: '/',
    };
  }

  _setCookies(req, res, accessToken, refreshToken, userId) {
    let actualReq = req;
    let actualRes = res;
    let actualAccessToken = accessToken;
    let actualRefreshToken = refreshToken;
    let actualUserId = userId;

    if (!userId && res && res.cookie) {
      actualReq = null;
      actualRes = req;
      actualAccessToken = res;
      actualRefreshToken = accessToken;
      actualUserId = refreshToken;
    }

    const cookieOpts = this._getCookieOpts(actualReq);

    actualRes.cookie('access_token', actualAccessToken, {
      ...cookieOpts,
      maxAge: 15 * 60 * 1000,
    });

    actualRes.cookie('refresh_token', actualRefreshToken, {
      ...cookieOpts,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    actualRes.cookie('user_id', actualUserId, {
      ...cookieOpts,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
  }

  _clearCookies(req, res) {
    let actualReq = req;
    let actualRes = res;
    if (!res && req && req.clearCookie) {
      actualRes = req;
      actualReq = null;
    }
    const cookieOpts = this._getCookieOpts(actualReq);
    actualRes.clearCookie('access_token', cookieOpts);
    actualRes.clearCookie('refresh_token', cookieOpts);
    actualRes.clearCookie('user_id', cookieOpts);
  }
}

module.exports = new AuthController();
