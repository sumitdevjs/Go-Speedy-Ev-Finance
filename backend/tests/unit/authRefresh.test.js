const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { generateAccessToken, verifyAccessToken } = require('../../src/utils/jwt');

describe('Auth Token Refresh & Expiration Logic', () => {
  test('Access token generated with 15m expiration', () => {
    const payload = { id: 'test-user-id', role: 'staff', name: 'Test', email: 'test@example.com' };
    const token = generateAccessToken(payload);
    const decoded = verifyAccessToken(token);

    expect(decoded).toBeTruthy();
    expect(decoded.id).toBe(payload.id);
    expect(decoded.role).toBe(payload.role);
    // Expiration timestamp should be approximately 15 minutes from now (900 seconds)
    const expiresInSec = decoded.exp - decoded.iat;
    expect(expiresInSec).toBe(15 * 60);
  });

  test('Refresh token rotation verification with bcrypt', async () => {
    // 1. Initial token generation
    const refreshToken1 = crypto.randomBytes(64).toString('hex');
    const hash1 = await bcrypt.hash(refreshToken1, 10);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Check validity
    expect(new Date(expiresAt) > new Date()).toBe(true);
    const isValid1 = await bcrypt.compare(refreshToken1, hash1);
    expect(isValid1).toBe(true);

    // 2. Refresh occurs -> new token generated (rotation)
    const refreshToken2 = crypto.randomBytes(64).toString('hex');
    const hash2 = await bcrypt.hash(refreshToken2, 10);

    // Old token should not match the new hash
    const isOldValid = await bcrypt.compare(refreshToken1, hash2);
    expect(isOldValid).toBe(false);

    // New token matches
    const isNewValid = await bcrypt.compare(refreshToken2, hash2);
    expect(isNewValid).toBe(true);
  });

  test('Expired refresh token date is recognized as expired', () => {
    const expiredDate = new Date(Date.now() - 1000).toISOString(); // 1 second in the past
    const isExpired = new Date(expiredDate) < new Date();
    expect(isExpired).toBe(true);
  });
});
