const authService = require('./auth.service');
const { successResponse, errorResponse } = require('../../utils/response');

class AuthController {
  async login(req, res) {
    try {
      const { email, password } = req.body;
      const result = await authService.login(email, password);

      // Set cookies
      this._setCookies(res, result.accessToken, result.refreshToken, result.user.id);

      return successResponse(res, 200, { user: result.user }, 'Login successful');
    } catch (error) {
      const status = error.message?.includes('deactivated') ? 403 : 401;
      return errorResponse(res, status, error.message || 'Invalid credentials');
    }
  }

  async refresh(req, res) {
    try {
      const refreshToken = req.cookies?.refresh_token;
      const userId = req.cookies?.user_id; // Stored alongside refresh token to identify user

      if (!refreshToken || !userId) {
        return errorResponse(res, 401, 'Unauthorized');
      }

      const result = await authService.refresh(refreshToken, userId);

      // Set cookies (rotation)
      this._setCookies(res, result.accessToken, result.refreshToken, result.user.id);

      return successResponse(res, 200, { user: result.user }, 'Token refreshed');
    } catch (error) {
      console.error('Refresh Token Error:', error);
      // Clear cookies on fail with proper options
      this._clearCookies(res);
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
      // Always clear cookies with proper options
      this._clearCookies(res);
      return successResponse(res, 200, null, 'Logged out successfully');
    }
  }

  async me(req, res) {
    // req.user is set by auth middleware
    return successResponse(res, 200, { user: req.user }, 'User profile retrieved');
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

  _getCookieOpts() {
    const env = require('../../config/env');
    const isProduction = env.NODE_ENV === 'production';
    return {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
      path: '/',
    };
  }

  _setCookies(res, accessToken, refreshToken, userId) {
    const cookieOpts = this._getCookieOpts();

    // Access token - 15 mins
    res.cookie('access_token', accessToken, {
      ...cookieOpts,
      maxAge: 15 * 60 * 1000,
    });

    // Refresh token - 7 days
    res.cookie('refresh_token', refreshToken, {
      ...cookieOpts,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    // User ID (for finding the correct refresh hash later) - 7 days
    res.cookie('user_id', userId, {
      ...cookieOpts,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
  }

  _clearCookies(res) {
    const cookieOpts = this._getCookieOpts();
    res.clearCookie('access_token', cookieOpts);
    res.clearCookie('refresh_token', cookieOpts);
    res.clearCookie('user_id', cookieOpts);
  }
}

module.exports = new AuthController();
