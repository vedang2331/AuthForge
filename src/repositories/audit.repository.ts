import { prisma } from './prisma.js';
import { memAuditLogs } from './memdb.js';
import { userRepository } from './user.repository.js';
import { v4 as uuidv4 } from 'uuid';

export class AuditRepository {
  async create(data: any) {
    try {
      return await prisma.auditLog.create({
        data,
      });
    } catch {
      const id = `al-${uuidv4().substring(0, 8)}`;
      const userId = data.user?.connect?.id || null;
      const user = userId ? await userRepository.findById(userId) : null;

      const log = {
        id,
        userId,
        user: user ? { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName } : null,
        action: data.action,
        ipAddress: data.ipAddress || null,
        userAgent: data.userAgent || null,
        metadata: data.metadata || {},
        createdAt: new Date(),
      };
      memAuditLogs.unshift(log);
      return log;
    }
  }

  async findAll(params: { page?: number; limit?: number; userId?: string; action?: string }) {
    const page = params.page || 1;
    const limit = params.limit || 20;

    try {
      const skip = (page - 1) * limit;
      const where: any = {
        ...(params.userId ? { userId: params.userId } : {}),
        ...(params.action ? { action: params.action } : {}),
      };

      const [logs, total] = await Promise.all([
        prisma.auditLog.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            user: {
              select: { id: true, email: true, firstName: true, lastName: true },
            },
          },
        }),
        prisma.auditLog.count({ where }),
      ]);

      return { logs, total, page, limit, totalPages: Math.ceil(total / limit) };
    } catch {
      let logs = [...memAuditLogs];
      if (params.userId) logs = logs.filter((l) => l.userId === params.userId);
      if (params.action) logs = logs.filter((l) => l.action === params.action);
      const total = logs.length;
      const skip = (page - 1) * limit;
      const sliced = logs.slice(skip, skip + limit);
      return { logs: sliced, total, page, limit, totalPages: Math.ceil(total / limit) };
    }
  }
}

export const auditRepository = new AuditRepository();
