import { prisma } from './prisma.js';
import { memApiKeys } from './memdb.js';
import { userRepository } from './user.repository.js';
import { v4 as uuidv4 } from 'uuid';

export class ApiKeyRepository {
  async create(data: any) {
    try {
      return await prisma.apiKey.create({
        data,
      });
    } catch {
      const id = `ak-${uuidv4().substring(0, 8)}`;
      const newKey = {
        id,
        userId: data.user.connect.id,
        name: data.name,
        keyIdentifier: data.keyIdentifier,
        keySecretHash: data.keySecretHash,
        permissions: data.permissions,
        expiresAt: data.expiresAt || null,
        lastUsedAt: null,
        isActive: data.isActive ?? true,
        createdAt: new Date(),
      };
      memApiKeys.set(id, newKey);
      return newKey;
    }
  }

  async findByKeyIdentifier(keyIdentifier: string) {
    try {
      return await prisma.apiKey.findUnique({
        where: { keyIdentifier },
        include: { user: true },
      });
    } catch {
      for (const k of memApiKeys.values()) {
        if (k.keyIdentifier === keyIdentifier) {
          const user = await userRepository.findById(k.userId);
          return { ...k, user };
        }
      }
      return null;
    }
  }

  async findByUserId(userId: string) {
    try {
      return await prisma.apiKey.findMany({
        where: { userId, isActive: true },
        orderBy: { createdAt: 'desc' },
      });
    } catch {
      return Array.from(memApiKeys.values())
        .filter((k) => k.userId === userId && k.isActive)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }
  }

  async updateLastUsed(id: string) {
    try {
      return await prisma.apiKey.update({
        where: { id },
        data: { lastUsedAt: new Date() },
      });
    } catch {
      const k = memApiKeys.get(id);
      if (k) {
        k.lastUsedAt = new Date();
      }
      return k;
    }
  }

  async revoke(id: string, userId: string) {
    try {
      return await prisma.apiKey.updateMany({
        where: { id, userId },
        data: { isActive: false },
      });
    } catch {
      const k = memApiKeys.get(id);
      if (k && k.userId === userId) {
        k.isActive = false;
      }
      return { count: 1 };
    }
  }
}

export const apiKeyRepository = new ApiKeyRepository();
