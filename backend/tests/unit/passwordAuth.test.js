const request = require('supertest');
const bcrypt = require('bcryptjs');

jest.mock('../../src/config/db', () => ({ from: jest.fn() }));
jest.mock('../../src/services/email.service', () => ({ sendOtpEmail: jest.fn() }));

const db = require('../../src/config/db');
const emailService = require('../../src/services/email.service');
const authService = require('../../src/modules/auth/auth.service');
const app = require('../../index');

let user;
let passwordHash;

beforeAll(async () => {
  passwordHash = await bcrypt.hash('synthetic-password', 4);
});

beforeEach(() => {
  jest.clearAllMocks();
  authService.otpCache.clear();
  user = {
    id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    email: 'staff@example.test', name: 'Synthetic Staff', phone: '0000000000',
    role: 'staff', branch_id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    head_office_id: null, is_active: true, password_hash: passwordHash, auth_version: 0,
  };
  // Only the database and email are replaced: routes, password verification,
  // JWTs, refresh rotation, cookies and authentication middleware remain real.
  db.from.mockImplementation((table) => {
    if (table === 'audit_logs') return { insert: jest.fn().mockResolvedValue({ error: null }) };
    if (table !== 'users') throw new Error(`Unexpected table: ${table}`);
    let updates;
    let single = false;
    const filters = [];
    const query = {
      select() { return this; },
      ilike(key, value) { filters.push(() => String(user[key]).toLowerCase() === value.toLowerCase()); return this; },
      eq(key, value) { filters.push(() => user[key] === value); return this; },
      single() { single = true; return this; },
      maybeSingle() { single = true; return this; },
      update(value) { updates = value; return this; },
      then(resolve, reject) {
        const matches = filters.every(f => f());
        if (matches && updates) Object.assign(user, updates);
        return Promise.resolve({ data: single ? (matches ? { ...user } : null) : (matches ? [{ ...user }] : []), error: null }).then(resolve, reject);
      },
    };
    return query;
  });
});

const cookiesFrom = res => res.headers['set-cookie'].map(cookie => cookie.split(';')[0]);

it.each([
  ['get', '/api/auth/google'],
  ['get', '/api/auth/google/callback?state=old-state&code=old-code'],
  ['post', '/api/auth/oauth/exchange'],
])('removed OAuth endpoint %s %s cannot issue credentials', async (method, path) => {
  const res = await request(app)[method](path).send({ code: 'old-code' });
  expect(res.status).toBe(404);
  expect(res.headers['set-cookie']).toBeUndefined();
  expect(res.headers.location).toBeUndefined();
  expect(db.from).not.toHaveBeenCalled();
});

it('preserves password login, authenticated profile, refresh rotation and logout', async () => {
  const login = await request(app).post('/api/auth/login').send({ email: user.email, password: 'synthetic-password' });
  expect(login.status).toBe(200);
  const cookies = cookiesFrom(login);
  expect(cookies.map(c => c.split('=')[0]).sort()).toEqual(['access_token', 'refresh_token', 'user_id']);
  expect(login.body.data.user.id).toBe(user.id);
  expect(login.body.data.user.password_hash).toBeUndefined();
  const me = await request(app).get('/api/auth/me').set('Cookie', cookies);
  expect(me.status).toBe(200);
  expect(me.body.data.user.id).toBe(user.id);
  const refresh = await request(app).post('/api/auth/refresh').set('Cookie', cookies);
  expect(refresh.status).toBe(200);
  expect(cookiesFrom(refresh).find(c => c.startsWith('refresh_token='))).not.toBe(cookies.find(c => c.startsWith('refresh_token=')));
  const logout = await request(app).post('/api/auth/logout').set('Cookie', cookiesFrom(refresh));
  expect(logout.status).toBe(200);
  expect(user.refresh_token_hash).toBeNull();
  const afterLogout = await request(app).post('/api/auth/refresh').set('Cookie', cookiesFrom(refresh));
  expect(afterLogout.status).toBe(401);
});

it('still rejects an incorrect password without setting a session', async () => {
  const res = await request(app).post('/api/auth/login').send({ email: user.email, password: 'incorrect-password' });
  expect(res.status).toBe(401);
  expect(res.headers['set-cookie']).toBeUndefined();
});

it('lets an account without a password recover through OTP and use password login', async () => {
  user.password_hash = null;
  const login = await request(app).post('/api/auth/login').send({ email: user.email, password: 'synthetic-password' });
  expect(login.status).toBe(401);
  expect(login.body.message).toMatch(/reset your password or contact your administrator/i);
  expect(login.headers['set-cookie']).toBeUndefined();

  const forgot = await request(app).post('/api/auth/forgot-password').send({ email: user.email });
  expect(forgot.status).toBe(200);
  const otp = emailService.sendOtpEmail.mock.calls[0][1];
  const reset = await request(app).post('/api/auth/reset-password').send({ email: user.email, otp, newPassword: 'new-synthetic-password' });
  expect(reset.status).toBe(200);
  const recovered = await request(app).post('/api/auth/login').send({ email: user.email, password: 'new-synthetic-password' });
  expect(recovered.status).toBe(200);
  expect(recovered.body.data.user.id).toBe(user.id);
});

it('rejects an existing access JWT after its password version is revoked', async () => {
  const login = await request(app).post('/api/auth/login').send({ email: user.email, password: 'synthetic-password' });
  expect(login.status).toBe(200);
  user.auth_version += 1; // Database password trigger is covered by real DB tests.
  const res = await request(app).get('/api/auth/me').set('Cookie', cookiesFrom(login));
  expect(res.status).toBe(401);
  expect(res.body.message).toMatch(/revoked/i);
});
