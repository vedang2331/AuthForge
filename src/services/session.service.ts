import { sessionRepository } from '../repositories/session.repository.js';
import { redis } from '../cache/redis.js';
import { auditService } from '../audit/audit.service.js';
import { AuditActions } from '../audit/audit.constants.js';
import { NotFoundError, ForbiddenError } from '../utils/errors.js';

export class SessionService {
  async getUserSessions(userId: string, currentSessionId?: string) {
    const sessions = await sessionRepository.findActiveByUserId(userId);
    return sessions.map((s: any) => ({
      id: s.id,
      ipAddress: s.ipAddress || 'Unknown',
      userAgent: s.userAgent || 'Unknown',
      deviceType: s.deviceType || 'Desktop',
      lastActiveAt: s.lastActiveAt,
      createdAt: s.createdAt,
      isCurrent: s.id === currentSessionId,
    }));
  }

  async revokeSession(sessionId: string, userId: string, ip?: string, userAgent?: string) {
    const session = await sessionRepository.findById(sessionId);
    if (!session) {
      throw new NotFoundError('Session not found');
    }

    if (session.userId !== userId) {
      throw new ForbiddenError('Cannot revoke session belonging to another user');
    }

    await sessionRepository.revoke(sessionId);
    await redis.del(`auth:session:${sessionId}`);

    await auditService.logEvent({
      action: AuditActions.SESSION_REVOKED,
      userId,
      ipAddress: ip,
      userAgent,
      metadata: { revokedSessionId: sessionId },
    });

    return { message: 'Session revoked successfully' };
  }
}

export const sessionService = new SessionService();
