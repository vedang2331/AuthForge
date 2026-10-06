import { apiKeyRepository } from '../repositories/apiKey.repository.js';
import { generateApiKey, hashToken } from '../security/hash.js';
import { auditService } from '../audit/audit.service.js';
import { AuditActions } from '../audit/audit.constants.js';
import { NotFoundError, UnauthorizedError } from '../utils/errors.js';

export class ApiKeyService {
  async createApiKey(
    userId: string,
    data: { name: string; permissions: string[]; expiresInDays?: number },
    ip?: string,
    userAgent?: string
  ) {
    const { keyIdentifier, secret, fullKey, keySecretHash } = generateApiKey();

    let expiresAt: Date | undefined;
    if (data.expiresInDays) {
      expiresAt = new Date(Date.now() + data.expiresInDays * 24 * 60 * 60 * 1000);
    }

    const apiKey = await apiKeyRepository.create({
      user: { connect: { id: userId } },
      name: data.name,
      keyIdentifier,
      keySecretHash,
      permissions: data.permissions,
      expiresAt: expiresAt || null,
      isActive: true,
    });

    await auditService.logEvent({
      action: AuditActions.API_KEY_CREATED,
      userId,
      ipAddress: ip,
      userAgent,
      metadata: { keyId: apiKey.id, keyIdentifier, name: apiKey.name },
    });

    return {
      id: apiKey.id,
      name: apiKey.name,
      keyIdentifier: apiKey.keyIdentifier,
      secret: fullKey, // Raw secret returned ONLY ONCE upon creation!
      permissions: apiKey.permissions,
      expiresAt: apiKey.expiresAt,
      createdAt: apiKey.createdAt,
    };
  }

  async getUserApiKeys(userId: string) {
    const keys = await apiKeyRepository.findByUserId(userId);
    return keys.map((k: any) => ({
      id: k.id,
      name: k.name,
      keyIdentifier: k.keyIdentifier,
      permissions: k.permissions,
      expiresAt: k.expiresAt,
      lastUsedAt: k.lastUsedAt,
      isActive: k.isActive,
      createdAt: k.createdAt,
    }));
  }

  async revokeApiKey(id: string, userId: string, ip?: string, userAgent?: string) {
    await apiKeyRepository.revoke(id, userId);

    await auditService.logEvent({
      action: AuditActions.API_KEY_REVOKED,
      userId,
      ipAddress: ip,
      userAgent,
      metadata: { keyId: id },
    });

    return { message: 'API key revoked successfully' };
  }

  async validateApiKey(fullKey: string) {
    const parts = fullKey.split('.');
    if (parts.length !== 2) {
      throw new UnauthorizedError('Invalid API Key format', 'INVALID_API_KEY');
    }

    const [keyIdentifier] = parts;
    const apiKey = await apiKeyRepository.findByKeyIdentifier(keyIdentifier);

    if (!apiKey || !apiKey.isActive) {
      throw new UnauthorizedError('Invalid or inactive API Key', 'INVALID_API_KEY');
    }

    if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
      throw new UnauthorizedError('Expired API Key', 'EXPIRED_API_KEY');
    }

    const hashedIncoming = hashToken(fullKey);
    if (hashedIncoming !== apiKey.keySecretHash) {
      throw new UnauthorizedError('Invalid API Key secret', 'INVALID_API_KEY');
    }

    // Update last used timestamp async
    apiKeyRepository.updateLastUsed(apiKey.id).catch(() => {});

    return apiKey;
  }
}

export const apiKeyService = new ApiKeyService();
