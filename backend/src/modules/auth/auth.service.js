const supabase = require('../../config/db');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { generateAccessToken } = require('../../utils/jwt');
const emailService = require('../../services/email.service');
const { logAudit } = require('../../utils/auditLog');

class AuthService {
  constructor() {
    this.otpCache = new Map();
  }

  async login(identifier, password) {
    const cleanId = String(identifier || '').trim();
    if (!cleanId) {
      throw new Error('Phone number or email is required.');
    }
    if (!password) {
      throw new Error('Password is required.');
    }

    const isEmail = cleanId.includes('@');

    let query = supabase.from('users').select('*');
    if (isEmail) {
      query = query.ilike('email', cleanId.toLowerCase());
    } else if (cleanId.toLowerCase() === 'admin') {
      query = query.eq('role', 'super_admin');
    } else {
      query = query.or(`phone.eq.${cleanId},email.ilike.${cleanId}`);
    }

    const { data: userList, error } = await query;
    const user = Array.isArray(userList) ? userList[0] : userList;

    if (error || !user) {
      throw new Error('Account not found with this phone number or email.');
    }

    if (!user.is_active) {
      throw new Error('Your account is deactivated. Kindly contact admin.');
    }

    if (!user.password_hash) {
      throw new Error('No password set for this account. Please reset your password or contact your administrator.');
    }
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      throw new Error('Wrong password! Please check your password and try again.');
    }

    return this._generateTokens(user);
  }

  async refresh(refreshToken, userId) {
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error || !user || !user.is_active || !user.refresh_token_hash) {
      throw new Error('Invalid session');
    }

    if (new Date(user.refresh_token_expires_at) < new Date()) {
      throw new Error('Refresh token expired');
    }

    const isMatch = await bcrypt.compare(refreshToken, user.refresh_token_hash);
    if (!isMatch) {
      throw new Error('Invalid refresh token');
    }

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

  async _generateTokens(user, forcedRole = null, forcedBranchId = null) {
    const isMasterAdmin = (user.role === 'super_admin' || user.role === 'admin') && !user.branch_id;
    let effectiveRole = forcedRole || (isMasterAdmin ? 'super_admin' : user.role);
    if (!isMasterAdmin && !forcedRole && user.role === 'branch_admin') {
      effectiveRole = 'branch_admin';
    }
    const branchId = forcedBranchId !== null ? forcedBranchId : (isMasterAdmin ? null : user.branch_id);

    const accessToken = generateAccessToken({
      id: user.id,
      auth_version: user.auth_version || 0,
      role: effectiveRole,
      name: user.name,
      email: user.email,
      head_office_id: user.head_office_id,
      branch_id: branchId,
    });

    const refreshToken = crypto.randomBytes(64).toString('hex');
    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const { data: sessionRows, error } = await supabase
      .from('users')
      .update({
        refresh_token_hash: refreshTokenHash,
        refresh_token_expires_at: expiresAt.toISOString(),
      })
      .eq('id', user.id)
      .eq('auth_version', user.auth_version || 0)
      .select('id');

    if (error || !sessionRows?.length) {
      throw new Error('Failed to create session');
    }

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: effectiveRole,
        head_office_id: user.head_office_id,
        branch_id: branchId,
        ward_area: user.ward_area,
      },
      accessToken,
      refreshToken,
    };
  }
  async requestPasswordReset(email) {
    if (!email) {
      throw new Error('Email address is required.');
    }

    const cleanEmail = email.trim().toLowerCase();

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

    const otp = String(crypto.randomInt(100000, 1000000));
    const otpHash = await bcrypt.hash(otp, 10);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    this.otpCache.set(cleanEmail, {
      otpHash,
      expiresAt: expiresAt.getTime(),
      userId: user.id,
    });

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

    await emailService.sendOtpEmail(cleanEmail, otp, user.name || 'User');

    return {
      success: true,
      message: 'A 6-digit verification code has been sent to your email.',
    };
  }

  async resetPasswordWithOtp(email, otp, newPassword, ip) {
    if (!email || !otp || !newPassword) {
      throw new Error('Email, OTP code, and new password are all required.');
    }

    if (newPassword.length < 6) {
      throw new Error('New password must be at least 6 characters long.');
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanOtp = String(otp).trim();

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

    const isOtpValid = await bcrypt.compare(cleanOtp, storedHash);
    if (!isOtpValid) {
      throw new Error('Invalid OTP code. Please check the code in your email.');
    }

    const newPasswordHash = await bcrypt.hash(newPassword, 10);

    const updatePayload = {
      password_hash: newPasswordHash,
      refresh_token_hash: null,
      refresh_token_expires_at: null,
      reset_otp_hash: null,
      reset_otp_expires_at: null,
      updated_at: new Date().toISOString(),
    };

    let { error: updateErr } = await supabase
      .from('users')
      .update(updatePayload)
      .eq('id', user.id);

    if (updateErr && updateErr.message?.includes('reset_otp')) {
      const fallbackPayload = {
        password_hash: newPasswordHash,
        refresh_token_hash: null,
        refresh_token_expires_at: null,
        updated_at: new Date().toISOString(),
      };
      const retry = await supabase
        .from('users')
        .update(fallbackPayload)
        .eq('id', user.id);
      updateErr = retry.error;
    }

    if (updateErr) {
      console.error('[Password Reset] Failed to update password:', updateErr);
      throw new Error('Failed to update password. Please try again.');
    }

    this.otpCache.delete(cleanEmail);

    await logAudit({
      userId: user.id,
      userRole: user.role,
      action: 'RESET_PASSWORD_OTP',
      entityType: 'users',
      entityId: user.id,
      changes: { password: 'Reset via forgot-password OTP' },
      ip,
    });

    return {
      success: true,
      message: 'Your password has been reset successfully! You can now log in.',
    };
  }

  async updateSelfProfile(userId, { name, email, phone }, ip) {
    if (!userId) throw new Error('User ID is required');

    const cleanName = name ? name.trim() : undefined;
    const cleanEmail = email ? email.trim().toLowerCase() : undefined;
    const cleanPhone = phone ? phone.trim() : undefined;

    if (cleanPhone && !/^\d{10}$/.test(cleanPhone)) {
      throw new Error('Phone number must be exactly 10 digits');
    }

    if (cleanEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      throw new Error('Please enter a valid email address');
    }

    if (cleanEmail) {
      const { data: existingEmail } = await supabase
        .from('users')
        .select('id')
        .eq('email', cleanEmail)
        .neq('id', userId)
        .maybeSingle();

      if (existingEmail) {
        throw new Error('This email address is already in use by another account');
      }
    }

    if (cleanPhone) {
      const { data: existingPhone } = await supabase
        .from('users')
        .select('id')
        .eq('phone', cleanPhone)
        .neq('id', userId)
        .maybeSingle();

      if (existingPhone) {
        throw new Error('This phone number is already registered to another account');
      }
    }

    const updates = {
      updated_at: new Date().toISOString()
    };
    if (cleanName) updates.name = cleanName;
    if (cleanEmail) updates.email = cleanEmail;
    if (cleanPhone) updates.phone = cleanPhone;

    const { data: updatedUser, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', userId)
      .select('id, name, email, phone, role, ward_area, branch_id, head_office_id, is_active')
      .single();

    if (error) {
      console.error('[Update Profile Error]:', error);
      throw new Error('Failed to update profile: ' + error.message);
    }

    await logAudit({
      userId: updatedUser.id,
      userRole: updatedUser.role,
      action: 'UPDATE_PROFILE',
      entityType: 'users',
      entityId: updatedUser.id,
      changes: { name: cleanName, email: cleanEmail, phone: cleanPhone },
      ip,
    });

    return updatedUser;
  }

  async changeSelfPassword(userId, { currentPassword, newPassword }, ip) {
    if (!userId) throw new Error('User ID is required');

    if (!newPassword || newPassword.length < 6) {
      throw new Error('Password must be at least 6 characters long');
    }

    const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{6,}$/;
    if (!passwordRegex.test(newPassword)) {
      throw new Error('Password must contain at least 1 uppercase letter, 1 number, and 1 special character');
    }

    const { data: user, error: fetchErr } = await supabase
      .from('users')
      .select('id, role, password_hash')
      .eq('id', userId)
      .single();

    if (fetchErr || !user) {
      throw new Error('User not found');
    }

    if (user.password_hash) {
      if (!currentPassword) {
        throw new Error('Current password is required');
      }
      const match = await bcrypt.compare(currentPassword, user.password_hash);
      if (!match) {
        throw new Error('Current password is incorrect');
      }
    }

    const newHash = await bcrypt.hash(newPassword, 10);

    const { error: updateErr } = await supabase
      .from('users')
      .update({
        password_hash: newHash,
        refresh_token_hash: null,
        refresh_token_expires_at: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (updateErr) {
      console.error('[Change Password Error]:', updateErr);
      throw new Error('Failed to update password');
    }

    await logAudit({
      userId: user.id,
      userRole: user.role,
      action: 'CHANGE_PASSWORD',
      entityType: 'users',
      entityId: user.id,
      changes: { password: 'User changed own password' },
      ip,
    });

    return { success: true, message: 'Password updated successfully' };
  }
}

module.exports = new AuthService();
