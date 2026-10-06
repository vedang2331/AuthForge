import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../auth/jwt.js';
import { apiKeyService } from '../services/apiKey.service.js';
import { userRepository } from '../repositories/user.repository.js';
import { UnauthorizedError } from '../utils/errors.js';

export async function authenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    const apiKeyHeader = req.headers['x-api-key'] as string;

    let token: string | undefined;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (apiKeyHeader) {
      token = apiKeyHeader;
    }

    if (!token) {
      throw new UnauthorizedError('Authentication token or API key required', 'TOKEN_MISSING');
    }

    // Check if it's an API Key (starts with 'af_live')
    if (token.startsWith('af_live')) {
      const apiKey = await apiKeyService.validateApiKey(token);
      const user = await userRepository.findById(apiKey.userId);
      if (!user || !user.isActive) {
        throw new UnauthorizedError('API Key user is inactive or not found', 'INVALID_API_KEY');
      }

      req.user = {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        roleId: user.roleId,
        role: user.role.name,
        permissions: apiKey.permissions, // API key scopes
      };
      req.apiKey = {
        id: apiKey.id,
        userId: apiKey.userId,
        name: apiKey.name,
        keyIdentifier: apiKey.keyIdentifier,
        permissions: apiKey.permissions,
      };
      return next();
    }

    // Standard JWT Access Token
    const payload = verifyAccessToken(token);
    req.user = {
      id: payload.sub,
      email: payload.email,
      firstName: '',
      lastName: '',
      roleId: '',
      role: payload.role,
      permissions: payload.permissions,
    };
    req.sessionId = payload.sid;
    req.tokenPayload = payload;

    next();
  } catch (error) {
    next(error);
  }
}
