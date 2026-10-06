import { userRepository } from '../repositories/user.repository.js';
import { roleRepository } from '../repositories/role.repository.js';
import { sessionRepository } from '../repositories/session.repository.js';
import { refreshTokenRepository } from '../repositories/refreshToken.repository.js';
import { hashPassword, comparePassword, hashToken, generateRandomToken } from '../security/hash.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../auth/jwt.js';
import { auditService } from '../audit/audit.service.js';
import { AuditActions } from '../audit/audit.constants.js';
import { redis } from '../cache/redis.js';
import { config } from '../config/index.js';
import {
  BadRequestError,
  ConflictError,
  UnauthorizedError,
  ForbiddenError,
} from '../utils/errors.js';
import { v4 as uuidv4 } from 'uuid';

export class AuthService {
  async register(data: { email: string; password: string; firstName: string; lastName: string }, ip?: string, userAgent?: string) {
    const existingUser = await userRepository.findByEmail(data.email);
    if (existingUser) {
      throw new ConflictError('User with this email address already exists');
    }

    const userRole = await roleRepository.findByName('User');
    if (!userRole) {
      throw new BadRequestError('Default User role not initialized in system');
    }

    const passwordHash = await hashPassword(data.password);
    const newUser = await userRepository.create({
      email: data.email,
      passwordHash,
      firstName: data.firstName,
      lastName: data.lastName,
      role: { connect: { id: userRole.id } },
      isEmailVerified: false,
    });

    // Create email verification token in Redis
    const verificationToken = generateRandomToken(32);
    const tokenHash = hashToken(verificationToken);
    await redis.set(`auth:verify:${tokenHash}`, newUser.id, 86400); // 24 hours

    await auditService.logEvent({
      action: 'LOGIN_SUCCESS',
      userId: newUser.id,
      ipAddress: ip,
      userAgent,
      metadata: { event: 'USER_REGISTERED', email: newUser.email },
    });

    return {
      user: {
        id: newUser.id,
        email: newUser.email,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        role: userRole.name,
        isEmailVerified: newUser.isEmailVerified,
      },
      verificationToken, // Returned for dev testing environment
    };
  }

  async login(
    data: { email: string; password: string },
    ip?: string,
    userAgent?: string,
    deviceType: string = 'Desktop'
  ) {
    const user = await userRepository.findByEmail(data.email);
    if (!user) {
      await auditService.logEvent({
        action: AuditActions.LOGIN_FAILED,
        ipAddress: ip,
        userAgent,
        metadata: { email: data.email, reason: 'USER_NOT_FOUND' },
      });
      throw new UnauthorizedError('Invalid email or password', 'INVALID_CREDENTIALS');
    }

    if (!user.isActive) {
      throw new ForbiddenError('Account has been disabled. Please contact administrator.');
    }

    // Account lockout check
    if (user.lockoutUntil && user.lockoutUntil > new Date()) {
      const remainingSec = Math.ceil((user.lockoutUntil.getTime() - Date.now()) / 1000);
      throw new ForbiddenError(`Account locked due to multiple failed login attempts. Try again in ${remainingSec} seconds.`, 'ACCOUNT_LOCKED');
    }

    const isPasswordValid = await comparePassword(data.password, user.passwordHash);
    if (!isPasswordValid) {
      const failedAttempts = user.failedLoginAttempts + 1;
      let lockoutUntil: Date | undefined;
      if (failedAttempts >= 5) {
        lockoutUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 min lockout
      }
      await userRepository.incrementFailedLogin(user.id, lockoutUntil);

      await auditService.logEvent({
        action: AuditActions.LOGIN_FAILED,
        userId: user.id,
        ipAddress: ip,
        userAgent,
        metadata: { failedAttempts, lockout: !!lockoutUntil },
      });

      throw new UnauthorizedError('Invalid email or password', 'INVALID_CREDENTIALS');
    }

    // Reset failed login attempts
    if (user.failedLoginAttempts > 0 || user.lockoutUntil) {
      await userRepository.resetFailedLogin(user.id);
    }

    // Extract permissions
    const permissions = user.role.permissions.map((rp: any) => rp.permission.name);

    // Create session (7 day expiry)
    const sessionExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const session = await sessionRepository.create({
      user: { connect: { id: user.id } },
      ipAddress: ip || null,
      userAgent: userAgent || null,
      deviceType,
      expiresAt: sessionExpiresAt,
    });

    // Cache session in Redis
    await redis.set(`auth:session:${session.id}`, JSON.stringify({
      userId: user.id,
      email: user.email,
      role: user.role.name,
      permissions,
    }), 7 * 86400);

    // Generate tokens
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
    const refreshExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await refreshTokenRepository.create({
      session: { connect: { id: session.id } },
      user: { connect: { id: user.id } },
      tokenHash: tokenHashStr,
      familyId,
      expiresAt: refreshExpiresAt,
    });

    await auditService.logEvent({
      action: AuditActions.LOGIN_SUCCESS,
      userId: user.id,
      ipAddress: ip,
      userAgent,
      metadata: { sessionId: session.id },
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

  async refreshToken(rawRefreshToken: string, ip?: string, userAgent?: string) {
    let payload: { sub: string; sid: string; familyId: string };
    try {
      payload = verifyRefreshToken(rawRefreshToken);
    } catch {
      throw new UnauthorizedError('Invalid or expired refresh token', 'REFRESH_TOKEN_INVALID');
    }

    const tokenHashStr = hashToken(rawRefreshToken);
    const dbToken = await refreshTokenRepository.findByTokenHash(tokenHashStr);

    if (!dbToken) {
      throw new UnauthorizedError('Refresh token not found', 'REFRESH_TOKEN_INVALID');
    }

    // REUSE DETECTION CHECK!
    if (dbToken.isUsed || dbToken.isRevoked) {
      // SECURITY BREACH DETECTED: Token reuse! Revoke all tokens in family & session
      await refreshTokenRepository.revokeFamily(dbToken.familyId);
      await sessionRepository.revoke(dbToken.sessionId);
      await redis.del(`auth:session:${dbToken.sessionId}`);

      await auditService.logEvent({
        action: AuditActions.TOKEN_REUSE_DETECTED,
        userId: dbToken.userId,
        ipAddress: ip,
        userAgent,
        metadata: { familyId: dbToken.familyId, sessionId: dbToken.sessionId },
      });

      throw new UnauthorizedError('Security Violation: Refresh token reuse detected. All user sessions invalidated.', 'TOKEN_REUSED');
    }

    // Mark old token as used
    await refreshTokenRepository.markAsUsed(dbToken.id);

    // Fetch user details for new access token
    const user = await userRepository.findById(dbToken.userId);
    if (!user || !user.isActive) {
      throw new ForbiddenError('User account is inactive or not found');
    }

    const permissions = user.role.permissions.map((rp: any) => rp.permission.name);

    // Issue new access token
    const newAccessToken = signAccessToken({
      sub: user.id,
      email: user.email,
      role: user.role.name,
      permissions,
      sid: dbToken.sessionId,
    });

    // Issue new refresh token attached to same familyId
    const newRawRefreshToken = signRefreshToken({
      sub: user.id,
      sid: dbToken.sessionId,
      familyId: dbToken.familyId,
    });
    const newTokenHashStr = hashToken(newRawRefreshToken);

    await refreshTokenRepository.create({
      session: { connect: { id: dbToken.sessionId } },
      user: { connect: { id: user.id } },
      tokenHash: newTokenHashStr,
      familyId: dbToken.familyId,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    // Update last active
    await sessionRepository.updateLastActive(dbToken.sessionId);

    await auditService.logEvent({
      action: AuditActions.TOKEN_REFRESH,
      userId: user.id,
      ipAddress: ip,
      userAgent,
    });

    return {
      accessToken: newAccessToken,
      refreshToken: newRawRefreshToken,
    };
  }

  async logout(sessionId: string, userId: string, ip?: string, userAgent?: string) {
    await sessionRepository.revoke(sessionId);
    await redis.del(`auth:session:${sessionId}`);

    await auditService.logEvent({
      action: AuditActions.SESSION_REVOKED,
      userId,
      ipAddress: ip,
      userAgent,
      metadata: { sessionId },
    });

    return { message: 'Logged out successfully' };
  }

  async logoutAll(userId: string, ip?: string, userAgent?: string) {
    await sessionRepository.revokeAllUserSessions(userId);
    await refreshTokenRepository.revokeAllUserTokens(userId);

    const activeSessions = await sessionRepository.findActiveByUserId(userId);
    for (const session of activeSessions) {
      await redis.del(`auth:session:${session.id}`);
    }

    await auditService.logEvent({
      action: AuditActions.ALL_SESSIONS_REVOKED,
      userId,
      ipAddress: ip,
      userAgent,
    });

    return { message: 'All active sessions have been revoked successfully' };
  }

  async forgotPassword(email: string, ip?: string, userAgent?: string) {
    const user = await userRepository.findByEmail(email);
    if (!user) {
      // Don't leak user existence
      return { message: 'If an account exists with that email, a password reset link has been sent.' };
    }

    const resetToken = generateRandomToken(32);
    const tokenHashStr = hashToken(resetToken);
    await redis.set(`auth:reset:${tokenHashStr}`, user.id, 900); // 15 min expiry

    await auditService.logEvent({
      action: AuditActions.PASSWORD_RESET_REQUESTED,
      userId: user.id,
      ipAddress: ip,
      userAgent,
    });

    return {
      message: 'If an account exists with that email, a password reset link has been sent.',
      resetToken, // Returned for dev/testing demo
    };
  }

  async resetPassword(token: string, newPassword: string, ip?: string, userAgent?: string) {
    const tokenHashStr = hashToken(token);
    const userId = await redis.get(`auth:reset:${tokenHashStr}`);

    if (!userId) {
      throw new BadRequestError('Invalid or expired password reset token');
    }

    const newPasswordHash = await hashPassword(newPassword);
    await userRepository.update(userId, { passwordHash: newPasswordHash });

    // Remove token from Redis
    await redis.del(`auth:reset:${tokenHashStr}`);

    // Invalidate all user sessions for security
    await sessionRepository.revokeAllUserSessions(userId);

    await auditService.logEvent({
      action: AuditActions.PASSWORD_RESET_COMPLETED,
      userId,
      ipAddress: ip,
      userAgent,
    });

    return { message: 'Password has been reset successfully. Please log in with your new password.' };
  }

  async verifyEmail(token: string) {
    const tokenHashStr = hashToken(token);
    const userId = await redis.get(`auth:verify:${tokenHashStr}`);

    if (!userId) {
      throw new BadRequestError('Invalid or expired email verification token');
    }

    await userRepository.update(userId, { isEmailVerified: true });
    await redis.del(`auth:verify:${tokenHashStr}`);

    return { message: 'Email verified successfully.' };
  }
}

export const authService = new AuthService();
