import { hashPassword, comparePassword, generateApiKey, hashToken } from '../../src/security/hash.js';
import { signAccessToken, verifyAccessToken, signRefreshToken, verifyRefreshToken } from '../../src/auth/jwt.js';

describe('Security & Auth Unit Tests', () => {
  describe('Password Hashing', () => {
    it('should hash a plain text password and verify successfully', async () => {
      const password = 'SuperSecret@123';
      const hash = await hashPassword(password);

      expect(hash).not.toBe(password);
      expect(hash.length).toBeGreaterThan(20);

      const isValid = await comparePassword(password, hash);
      expect(isValid).toBe(true);

      const isInvalid = await comparePassword('WrongPassword', hash);
      expect(isInvalid).toBe(false);
    });
  });

  describe('API Key Generation & Hashing', () => {
    it('should generate an API key with prefix, identifier, secret, and hash', () => {
      const apiKeyData = generateApiKey();

      expect(apiKeyData.keyIdentifier).toMatch(/^af_live_[a-f0-9]{8}$/);
      expect(apiKeyData.fullKey).toContain(apiKeyData.keyIdentifier);
      expect(apiKeyData.keySecretHash).toBe(hashToken(apiKeyData.fullKey));
    });
  });

  describe('JWT Access & Refresh Tokens', () => {
    it('should sign and verify access token correctly', () => {
      const payload = {
        sub: 'user-123',
        email: 'test@example.com',
        role: 'Developer',
        permissions: ['PROJECT_READ', 'API_MANAGE'],
        sid: 'session-456',
      };

      const token = signAccessToken(payload);
      expect(typeof token).toBe('string');

      const decoded = verifyAccessToken(token);
      expect(decoded.sub).toBe(payload.sub);
      expect(decoded.email).toBe(payload.email);
      expect(decoded.role).toBe(payload.role);
      expect(decoded.permissions).toEqual(payload.permissions);
    });

    it('should sign and verify refresh token with familyId', () => {
      const refreshPayload = {
        sub: 'user-123',
        sid: 'session-456',
        familyId: 'family-789',
      };

      const refreshToken = signRefreshToken(refreshPayload);
      const decoded = verifyRefreshToken(refreshToken);

      expect(decoded.sub).toBe(refreshPayload.sub);
      expect(decoded.sid).toBe(refreshPayload.sid);
      expect(decoded.familyId).toBe(refreshPayload.familyId);
    });
  });
});
