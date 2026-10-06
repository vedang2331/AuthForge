import { prisma } from './prisma.js';
import { memRefreshTokens } from './memdb.js';
import { userRepository } from './user.repository.js';
import { sessionRepository } from './session.repository.js';
import { v4 as uuidv4 } from 'uuid';

export class RefreshTokenRepository {
  async create(data: any) {
    try {
      return await prisma.refreshToken.create({
        data,
      });
    } catch {
      const id = `rt-${uuidv4().substring(0, 8)}`;
      const newToken = {
        id,
        sessionId: data.session.connect.id,
        userId: data.user.connect.id,
        tokenHash: data.tokenHash,
        familyId: data.familyId,
        isUsed: false,
        isRevoked: false,
        expiresAt: data.expiresAt,
        createdAt: new Date(),
      };
      memRefreshTokens.set(data.tokenHash, newToken);
      return newToken;
    }
  }

  async findByTokenHash(tokenHash: string) {
    try {
      return await prisma.refreshToken.findUnique({
        where: { tokenHash },
        include: {
          user: true,
          session: true,
        },
      });
    } catch {
      const token = memRefreshTokens.get(tokenHash);
      if (!token) return null;
      const user = await userRepository.findById(token.userId);
      const session = await sessionRepository.findById(token.sessionId);
      return { ...token, user, session };
    }
  }

  async markAsUsed(id: string) {
    try {
      return await prisma.refreshToken.update({
        where: { id },
        data: { isUsed: true },
      });
    } catch {
      for (const t of memRefreshTokens.values()) {
        if (t.id === id) {
          t.isUsed = true;
          return t;
        }
      }
      return null;
    }
  }

  async revokeFamily(familyId: string) {
    try {
      return await prisma.refreshToken.updateMany({
        where: { familyId },
        data: { isRevoked: true },
      });
    } catch {
      for (const t of memRefreshTokens.values()) {
        if (t.familyId === familyId) {
          t.isRevoked = true;
        }
      }
      return { count: 1 };
    }
  }

  async revokeAllUserTokens(userId: string) {
    try {
      return await prisma.refreshToken.updateMany({
        where: { userId },
        data: { isRevoked: true },
      });
    } catch {
      for (const t of memRefreshTokens.values()) {
        if (t.userId === userId) {
          t.isRevoked = true;
        }
      }
      return { count: 1 };
    }
  }
}

export const refreshTokenRepository = new RefreshTokenRepository();
