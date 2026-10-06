import { prisma } from './prisma.js';
import { memSessions } from './memdb.js';
import { v4 as uuidv4 } from 'uuid';

export class SessionRepository {
  async create(data: any) {
    try {
      return await prisma.session.create({
        data,
      });
    } catch {
      const id = `s-${uuidv4().substring(0, 8)}`;
      const userId = data.user.connect.id;
      const newSession = {
        id,
        userId,
        ipAddress: data.ipAddress || null,
        userAgent: data.userAgent || null,
        deviceType: data.deviceType || 'Desktop',
        lastActiveAt: new Date(),
        isRevoked: false,
        expiresAt: data.expiresAt,
        createdAt: new Date(),
      };
      memSessions.set(id, newSession);
      return newSession;
    }
  }

  async findById(id: string) {
    try {
      return await prisma.session.findUnique({
        where: { id },
      });
    } catch {
      return memSessions.get(id) || null;
    }
  }

  async findActiveByUserId(userId: string) {
    try {
      return await prisma.session.findMany({
        where: {
          userId,
          isRevoked: false,
          expiresAt: { gt: new Date() },
        },
        orderBy: { lastActiveAt: 'desc' },
      });
    } catch {
      const now = new Date();
      return Array.from(memSessions.values())
        .filter((s) => s.userId === userId && !s.isRevoked && s.expiresAt > now)
        .sort((a, b) => b.lastActiveAt.getTime() - a.lastActiveAt.getTime());
    }
  }

  async updateLastActive(id: string) {
    try {
      return await prisma.session.update({
        where: { id },
        data: { lastActiveAt: new Date() },
      });
    } catch {
      const s = memSessions.get(id);
      if (s) {
        s.lastActiveAt = new Date();
      }
      return s;
    }
  }

  async revoke(id: string) {
    try {
      return await prisma.session.update({
        where: { id },
        data: { isRevoked: true },
      });
    } catch {
      const s = memSessions.get(id);
      if (s) {
        s.isRevoked = true;
      }
      return s;
    }
  }

  async revokeAllUserSessions(userId: string) {
    try {
      return await prisma.session.updateMany({
        where: { userId, isRevoked: false },
        data: { isRevoked: true },
      });
    } catch {
      for (const s of memSessions.values()) {
        if (s.userId === userId) {
          s.isRevoked = true;
        }
      }
      return { count: memSessions.size };
    }
  }
}

export const sessionRepository = new SessionRepository();
