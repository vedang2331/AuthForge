import request from 'supertest';
import { app } from '../../src/app.js';

describe('RBAC & API Keys Integration Tests', () => {
  let adminToken: string;
  let devToken: string;
  let userToken: string;
  let rawApiKey: string;

  beforeAll(async () => {
    // Login seeded SuperAdmin
    const adminLogin = await request(app).post('/api/v1/auth/login').send({
      email: 'admin@authforge.io',
      password: 'Admin@123456',
    });
    adminToken = adminLogin.body.data.accessToken;

    // Login seeded Developer
    const devLogin = await request(app).post('/api/v1/auth/login').send({
      email: 'dev@authforge.io',
      password: 'User@123456',
    });
    devToken = devLogin.body.data.accessToken;

    // Login seeded Standard User
    const userLogin = await request(app).post('/api/v1/auth/login').send({
      email: 'user@authforge.io',
      password: 'User@123456',
    });
    userToken = userLogin.body.data.accessToken;
  });

  describe('RBAC Authorization', () => {
    it('SuperAdmin can access admin audit logs (AUDIT_READ permission)', async () => {
      const res = await request(app)
        .get('/api/v1/audit-logs')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('Standard User CANNOT access audit logs (Permission denied -> 403)', async () => {
      const res = await request(app)
        .get('/api/v1/audit-logs')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('PERMISSION_DENIED');
    });

    it('Unauthenticated request gets rejected with 401', async () => {
      const res = await request(app).get('/api/v1/audit-logs');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('API Key Management & Authentication', () => {
    it('Developer user creates a new API key with permissions', async () => {
      const res = await request(app)
        .post('/api/v1/api-keys')
        .set('Authorization', `Bearer ${devToken}`)
        .send({
          name: 'DevFlow Integration Key',
          permissions: ['PROJECT_READ', 'USER_READ'],
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.secret).toBeDefined();
      expect(res.body.data.keyIdentifier).toMatch(/^af_live_/);

      rawApiKey = res.body.data.secret;
    });

    it('Developer lists API keys without exposing secrets', async () => {
      const res = await request(app)
        .get('/api/v1/api-keys')
        .set('Authorization', `Bearer ${devToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data[0].secret).toBeUndefined(); // Secret never exposed again
    });

    it('API Key can authenticate requests via x-api-key header', async () => {
      const res = await request(app)
        .get('/api/v1/users/me')
        .set('x-api-key', rawApiKey);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toBe('dev@authforge.io');
    });
  });

  describe('API Gateway Routing', () => {
    it('Forward request through Gateway (/gateway/projects)', async () => {
      const res = await request(app)
        .get('/gateway/projects')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.service).toBe('project-service');
      expect(res.body.data.projects).toBeDefined();
    });
  });
});
