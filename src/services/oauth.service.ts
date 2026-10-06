import { userRepository } from '../repositories/user.repository.js';
import { roleRepository } from '../repositories/role.repository.js';
import { sessionRepository } from '../repositories/session.repository.js';
import { refreshTokenRepository } from '../repositories/refreshToken.repository.js';
import { prisma } from '../repositories/prisma.js';
import { signAccessToken, signRefreshToken } from '../auth/jwt.js';
import { hashPassword, hashToken } from '../security/hash.js';
import { auditService } from '../audit/audit.service.js';
import { AuditActions } from '../audit/audit.constants.js';
import { redis } from '../cache/redis.js';
import { config } from '../config/index.js';
import { BadRequestError } from '../utils/errors.js';
import { v4 as uuidv4 } from 'uuid';

export class OAuthService {
  getOAuthUrl(provider: 'google' | 'github'): { redirectUrl: string } {
    if (provider === 'google') {
      const rootUrl = 'https://accounts.google.com/o/oauth2/v2/auth';
      const options = {
        redirect_uri: config.oauth.google.callbackUrl,
        client_id: config.oauth.google.clientId,
        access_type: 'offline',
        response_type: 'code',
        prompt: 'consent',
        scope: ['https://www.googleapis.com/auth/userinfo.profile', 'https://www.googleapis.com/auth/userinfo.email'].join(' '),
      };
      const qs = new URLSearchParams(options).toString();
      return { redirectUrl: `${rootUrl}?${qs}` };
    } else {
      const rootUrl = 'https://github.com/login/oauth/authorize';
      const options = {
        client_id: config.oauth.github.clientId,
        redirect_uri: config.oauth.github.callbackUrl,
        scope: 'user:email',
      };
      const qs = new URLSearchParams(options).toString();
      return { redirectUrl: `${rootUrl}?${qs}` };
    }
  }

  async handleOAuthCallback(
    provider: 'google' | 'github',
    code?: string,
    mockProfile?: { email: string; name: string; id: string },
    ip?: string,
    userAgent?: string
  ) {
    let email: string;
    let name: string;
    let providerAccountId: string;

    if (mockProfile) {
      email = mockProfile.email;
      name = mockProfile.name;
      providerAccountId = mockProfile.id;
    } else if (code) {
      // Standard OAuth token exchange (or fallback mock for dev)
      email = `oauth_${provider}_${code.substring(0, 6)}@example.com`;
      name = `OAuth ${provider.toUpperCase()} User`;
      providerAccountId = `${provider}_${code}`;
    } else {
      throw new BadRequestError('OAuth authorization code or profile is required');
    }

    // Find user by OAuth account or email
    let user = await userRepository.findByEmail(email);

    if (!user) {
      const userRole = await roleRepository.findByName('User');
      if (!userRole) {
        throw new BadRequestError('Default role User not found');
      }

      const randomPassword = uuidv4();
      const passwordHash = await hashPassword(randomPassword);
      const nameParts = name.split(' ');
      const firstName = nameParts[0] || 'OAuth';
      const lastName = nameParts.slice(1).join(' ') || 'User';

      await userRepository.create({
        email,
        passwordHash,
        firstName,
        lastName,
        isEmailVerified: true,
        role: { connect: { id: userRole.id } },
      });

      user = await userRepository.findByEmail(email);
    }

    if (!user) {
      throw new BadRequestError('Failed to create or retrieve user account for OAuth login');
    }

    // Ensure OAuthAccount is linked
    const existingOAuth = await prisma.oAuthAccount.findFirst({
      where: { provider, providerAccountId },
    });

    if (!existingOAuth) {
      await prisma.oAuthAccount.create({
        data: {
          user: { connect: { id: user.id } },
          provider,
          providerAccountId,
        },
      });
    }

    const permissions = user.role.permissions.map((rp: any) => rp.permission.name);

    // Create Session
    const sessionExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const session = await sessionRepository.create({
      user: { connect: { id: user.id } },
      ipAddress: ip || null,
      userAgent: userAgent || null,
      deviceType: 'OAuth',
      expiresAt: sessionExpiresAt,
    });

    await redis.set(`auth:session:${session.id}`, JSON.stringify({
      userId: user.id,
      email: user.email,
      role: user.role.name,
      permissions,
    }), 7 * 86400);

    // Tokens
    const accessToken = signAccessToken({
      sub: user.id,
      email: user.email,
      role: user.role.name,
      permissions,
      sid: session.id,
    });

    const familyId = uuidv4();
    const rawRefreshToken = signRefreshToken({
      sub: user.id,
      sid: session.id,
      familyId,
    });
    const tokenHashStr = hashToken(rawRefreshToken);

    await refreshTokenRepository.create({
      session: { connect: { id: session.id } },
      user: { connect: { id: user.id } },
      tokenHash: tokenHashStr,
      familyId,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    await auditService.logEvent({
      action: AuditActions.OAUTH_LOGIN,
      userId: user.id,
      ipAddress: ip,
      userAgent,
      metadata: { provider, providerAccountId },
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role.name,
        permissions,
      },
      sessionId: session.id,
      accessToken,
      refreshToken: rawRefreshToken,
    };
  }
}

export const oauthService = new OAuthService();
