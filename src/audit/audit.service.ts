import { auditRepository } from '../repositories/audit.repository.js';
import { logger } from '../logging/logger.js';
import { AuditAction } from './audit.constants.js';

export class AuditService {
  async logEvent(params: {
    action: AuditAction;
    userId?: string;
    ipAddress?: string;
    userAgent?: string;
    metadata?: Record<string, any>;
  }): Promise<void> {
    try {
      logger.info(`[AUDIT] Event: ${params.action}`, {
        action: params.action,
        userId: params.userId,
        ip: params.ipAddress,
        metadata: params.metadata,
      });

      await auditRepository.create({
        action: params.action,
        user: params.userId ? { connect: { id: params.userId } } : undefined,
        ipAddress: params.ipAddress || null,
        userAgent: params.userAgent || null,
        metadata: params.metadata || {},
      });
    } catch (error: any) {
      logger.error(`Failed to write audit log event: ${error.message}`);
    }
  }

  async getLogs(params: { page?: number; limit?: number; userId?: string; action?: string }) {
    return auditRepository.findAll(params);
  }
}

export const auditService = new AuditService();
