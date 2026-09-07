const supabase = require('../../config/db');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { generateAccessToken } = require('../../utils/jwt');

/**
 * Service to handle authentication logic
 */
class AuthService {
  async login(email, password) {
    // Find user
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .or(`email.eq.${email},phone.eq.${email}`)
      .single();

    if (error || !user) {
      throw new Error('Invalid credentials');
    }

    if (!user.is_active) {
      throw new Error('Account is deactivated');
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      throw new Error('Invalid credentials');
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
    const accessToken = generateAccessToken({ id: user.id, role: user.role });
    
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
        role: user.role,
      },
      accessToken,
      refreshToken,
    };
  }
}

module.exports = new AuthService();
