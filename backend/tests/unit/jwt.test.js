const { generateAccessToken, verifyAccessToken } = require('../../src/utils/jwt');

describe('JWT Utility', () => {
  test('generates and verifies access token correctly', () => {
    const payload = { id: 'user-123', role: 'admin' };
    const token = generateAccessToken(payload);
    expect(typeof token).toBe('string');

    const decoded = verifyAccessToken(token);
    expect(decoded).toBeTruthy();
    expect(decoded.id).toBe('user-123');
    expect(decoded.role).toBe('admin');
  });

  test('returns null on invalid token', () => {
    const decoded = verifyAccessToken('invalid.token.here');
    expect(decoded).toBeNull();
  });
});
