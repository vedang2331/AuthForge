import request from 'supertest';
import { app } from '../../src/app.js';

describe('Auth Endpoints Integration Tests', () => {
  const testUser = {
    email: `test_auth_${Date.now()}@authforge.io`,
    password: 'Password@123',
    firstName: 'Test',
    lastName: 'User',
  };

  let accessToken: string;
  let refreshToken: string;
  let sessionId: string;

  it('1. POST /api/v1/auth/register - should register a new user successfully', async () => {
    const res = await request(app).post('/api/v1/auth/register').send(testUser);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe(testUser.email);
    expect(res.body.data.user.role).toBe('User');
    expect(res.body.data.user.passwordHash).toBeUndefined();
  });

  it('2. POST /api/v1/auth/register - should reject duplicate email registration', async () => {
    const res = await request(app).post('/api/v1/auth/register').send(testUser);

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('CONFLICT');
  });

  it('3. POST /api/v1/auth/login - should authenticate valid user credentials', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({
      email: testUser.email,
      password: testUser.password,
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.refreshToken).toBeDefined();
    expect(res.body.data.sessionId).toBeDefined();

    accessToken = res.body.data.accessToken;
    refreshToken = res.body.data.refreshToken;
    sessionId = res.body.data.sessionId;
  });

  it('4. POST /api/v1/auth/login - should reject invalid password', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({
      email: testUser.email,
      password: 'WrongPassword@123',
    });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('5. POST /api/v1/auth/refresh - should rotate refresh token and issue new access token', async () => {
    const res = await request(app).post('/api/v1/auth/refresh').send({ refreshToken });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.refreshToken).toBeDefined();
    expect(res.body.data.refreshToken).not.toBe(refreshToken);

    // Save the newly rotated refresh token
    const newRefreshToken = res.body.data.refreshToken;

    // 6. Refresh Token Reuse Detection Test!
    // Try using the OLD refresh token again -> Breach detection should trigger!
    const reuseRes = await request(app).post('/api/v1/auth/refresh').send({ refreshToken });

    expect(reuseRes.status).toBe(401);
    expect(reuseRes.body.success).toBe(false);
    expect(reuseRes.body.error.code).toBe('TOKEN_REUSED');
  });

  it('7. GET /api/v1/users/me - should return user profile with valid JWT access token', async () => {
    const res = await request(app)
      .get('/api/v1/users/me')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.email).toBe(testUser.email);
  });

  it('8. POST /api/v1/auth/logout - should log out current user session', async () => {
    const res = await request(app)
      .post('/api/v1/auth/logout')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
