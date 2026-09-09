const supabase = require('../../config/db');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { generateAccessToken } = require('../../utils/jwt');
const emailService = require('../../services/email.service');
const { logAudit } = require('../../utils/auditLog');

/**
 * Service to handle authentication logic
 */
class AuthService {
  constructor() {
    // In-memory cache for OTPs as a resilient fallback
    this.otpCache = new Map();
  }

  async login(email, password) {
    // Find user
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .or(`email.eq.${email},phone.eq.${email}`)
      .single();

    if (error || !user) {
      throw new Error('Account not found with this phone number or email.');
    }

    if (!user.is_active) {
      throw new Error('Your account is deactivated. Kindly contact admin.');
    }

    // Check password
    if (!user.password_hash) {
      throw new Error('No password set for this account. Please use Google Sign-In or Reset Password.');
    }
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      throw new Error('Wrong password! Please check your password and try again.');
    }

    // Generate Tokens
    return this._generateTokens(user);
  }

  async refresh(refreshToken, userId) {
    // Find user
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error || !user || !user.is_active || !user.refresh_token_hash) {
      throw new Error('Invalid session');
    }

    // Check expiry
    if (new Date(user.refresh_token_expires_at) < new Date()) {
      throw new Error('Refresh token expired');
    }

    // Verify token
    const isMatch = await bcrypt.compare(refreshToken, user.refresh_token_hash);
    if (!isMatch) {
      throw new Error('Invalid refresh token');
    }

    // Generate Tokens (Rotates the refresh token)
    return this._generateTokens(user);
  }

  async logout(userId) {
    const { error } = await supabase
      .from('users')
      .update({
        refresh_token_hash: null,
        refresh_token_expires_at: null,
      })
      .eq('id', userId);

    if (error) {
      throw new Error('Logout failed');
    }
  }

  async _generateTokens(user) {
    const accessToken = generateAccessToken({
      id: user.id,
      role: user.role,
      name: user.name,
      email: user.email,
    });
    
    // Generate new refresh token
    const refreshToken = crypto.randomBytes(64).toString('hex');
    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    // Store hash in DB
    const { error } = await supabase
      .from('users')
      .update({
        refresh_token_hash: refreshTokenHash,
        refresh_token_expires_at: expiresAt.toISOString(),
      })
      .eq('id', user.id);

    if (error) {
      throw new Error('Failed to create session');
    }

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
      accessToken,
      refreshToken,
    };
  }
  async findOrCreateOAuthUser(profile) {
    const email = profile.emails?.[0]?.value || null;
    const oauthId = String(profile.id);
    const name = profile.displayName || profile.name?.givenName || 'Google User';

    // 1. Try to find existing user by oauth_id (if column exists)
    try {
      const { data: byOAuth, error: oauthErr } = await supabase
        .from('users')
        .select('*')
        .eq('oauth_id', oauthId)
        .maybeSingle();

      if (!oauthErr && byOAuth) {
        if (!byOAuth.is_active) {
          const err = new Error('Account is deactivated. Kindly contact the administrator.');
          err.code = 'ACCOUNT_DEACTIVATED';
          throw err;
        }
        return this._generateTokens(byOAuth);
      }
    } catch (e) {
      if (e.code === 'ACCOUNT_DEACTIVATED') throw e;
      console.warn('[OAuth] oauth_id lookup skipped:', e.message);
    }

    // 2. Try to find by email (user must be pre-registered by Admin)
    if (email) {
      const { data: byEmail, error: emailErr } = await supabase
        .from('users')
        .select('*')
        .ilike('email', email)
        .maybeSingle();

      if (!emailErr && byEmail) {
        if (!byEmail.is_active) {
          const err = new Error('Account is deactivated. Kindly contact the administrator.');
          err.code = 'ACCOUNT_DEACTIVATED';
          throw err;
        }

        // Link OAuth credentials to this admin-created user account
        try {
          await supabase
            .from('users')
            .update({ oauth_provider: 'google', oauth_id: oauthId })
            .eq('id', byEmail.id);
        } catch (_) {
          // If oauth columns don't exist yet, continue without error
        }

        return this._generateTokens({ ...byEmail, oauth_provider: 'google', oauth_id: oauthId });
      }
    }

    // 3. User is NOT found in database!
    // Strict Access Control: DO NOT allow open self-registration.
    // Only users whose email was pre-registered by Admin can log in.
    const notRegErr = new Error('Access denied. Your email is not registered. Kindly contact admin.');
    notRegErr.code = 'NOT_REGISTERED';
    throw notRegErr;
  }

  /**
   * Request Password Reset OTP
   * Generates a 6-digit OTP, stores its hash with a 10-min expiry, and emails it.
   */
  async requestPasswordReset(email) {
    if (!email) {
      throw new Error('Email address is required.');
    }

    const cleanEmail = email.trim().toLowerCase();

    // Look up user by email
    const { data: user, error } = await supabase
      .from('users')
      .select('id, name, email, is_active')
      .ilike('email', cleanEmail)
      .maybeSingle();

    if (error || !user) {
      throw new Error('No account found with this email address.');
    }

    if (!user.is_active) {
      throw new Error('This account is deactivated. Kindly contact the administrator.');
    }

    // Generate secure 6-digit numeric OTP
    const otp = String(crypto.randomInt(100000, 1000000));
    const otpHash = await bcrypt.hash(otp, 10);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Store in memory cache as immediate guarantee
    this.otpCache.set(cleanEmail, {
      otpHash,
      expiresAt: expiresAt.getTime(),
      userId: user.id,
    });

    // Also persist in database (if columns exist)
    try {
      await supabase
        .from('users')
        .update({
          reset_otp_hash: otpHash,
          reset_otp_expires_at: expiresAt.toISOString(),
        })
        .eq('id', user.id);
    } catch (dbErr) {
      console.warn('[Password Reset] DB persistence note (fallback to memory cache):', dbErr.message);
    }

    // Send the email via Gmail SMTP
    await emailService.sendOtpEmail(cleanEmail, otp, user.name || 'User');

    return {
      success: true,
      message: 'A 6-digit verification code has been sent to your email.',
    };
  }

  /**
   * Verify OTP and Reset Password
   */
  async resetPasswordWithOtp(email, otp, newPassword, ip) {
    if (!email || !otp || !newPassword) {
      throw new Error('Email, OTP code, and new password are all required.');
    }

    if (newPassword.length < 6) {
      throw new Error('New password must be at least 6 characters long.');
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanOtp = String(otp).trim();

    // Look up user
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .ilike('email', cleanEmail)
      .maybeSingle();

    if (error || !user) {
      throw new Error('No account found with this email address.');
    }

    if (!user.is_active) {
      throw new Error('This account is deactivated. Kindly contact the administrator.');
    }

    // Check OTP: First check DB, fallback to in-memory cache
    let storedHash = user.reset_otp_hash;
    let storedExpiry = user.reset_otp_expires_at ? new Date(user.reset_otp_expires_at).getTime() : null;

    if (!storedHash && this.otpCache.has(cleanEmail)) {
      const cached = this.otpCache.get(cleanEmail);
      storedHash = cached.otpHash;
      storedExpiry = cached.expiresAt;
    }

    if (!storedHash || !storedExpiry) {
      throw new Error('No active password reset request found. Please request a new OTP.');
    }

    if (Date.now() > storedExpiry) {
      this.otpCache.delete(cleanEmail);
      throw new Error('The OTP code has expired. Please request a new code.');
    }

    // Compare OTP
    const isOtpValid = await bcrypt.compare(cleanOtp, storedHash);
    if (!isOtpValid) {
      throw new Error('Invalid OTP code. Please check the code in your email.');
    }

    // Hash the new password
    const newPasswordHash = await bcrypt.hash(newPassword, 10);

    // Update password in database and clear reset OTP fields
    const updatePayload = {
      password_hash: newPasswordHash,
      updated_at: new Date().toISOString(),
    };

    // Try clearing reset_otp columns if they exist
    try {
      updatePayload.reset_otp_hash = null;
      updatePayload.reset_otp_expires_at = null;
    } catch (_) {}

    let { error: updateErr } = await supabase
      .from('users')
      .update(updatePayload)
      .eq('id', user.id);

    if (updateErr && updateErr.message?.includes('reset_otp')) {
      // Columns don't exist yet in Supabase schema, update only password_hash
      const fallbackPayload = {
        password_hash: newPasswordHash,
        updated_at: new Date().toISOString(),
      };
      const retry = await supabase
        .from('users')
        .update(fallbackPayload)
        .eq('id', user.id);
      updateErr = retry.error;
    }

    if (updateErr) {
      throw new Error('Failed to update password: ' + updateErr.message);
    }

    // Clear cache
    this.otpCache.delete(cleanEmail);

    // Never log the password itself — just record that a self-service reset happened,
    // same convention as the admin-driven CHANGE_PASSWORD entries.
    await logAudit({
      userId: user.id,
      userRole: user.role,
      action: 'RESET_PASSWORD_OTP',
      entityType: 'users',
      entityId: user.id,
      changes: { password: 'Reset via forgot-password OTP' },
      ip,
    });

    console.log(`✅ Password successfully reset for user: ${cleanEmail}`);

    return {
      success: true,
      message: 'Your password has been reset successfully! You can now log in.',
    };
  }
}

module.exports = new AuthService();
