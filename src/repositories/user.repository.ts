import { prisma } from './prisma.js';
import { memUsers, memRoles } from './memdb.js';
import { v4 as uuidv4 } from 'uuid';

export class UserRepository {
  async findByEmail(email: string) {
    try {
      return await prisma.user.findUnique({
        where: { email },
        include: {
          role: {
            include: {
              permissions: {
                include: {
                  permission: true,
                },
              },
            },
          },
        },
      });
    } catch {
      for (const u of memUsers.values()) {
        if (u.email.toLowerCase() === email.toLowerCase()) {
          return u;
        }
      }
      return null;
    }
  }

  async findById(id: string) {
    try {
      return await prisma.user.findUnique({
        where: { id },
        include: {
          role: {
            include: {
              permissions: {
                include: {
                  permission: true,
                },
              },
            },
          },
        },
      });
    } catch {
      return memUsers.get(id) || null;
    }
  }

  async create(data: any) {
    try {
      return await prisma.user.create({
        data,
        include: {
          role: true,
        },
      });
    } catch {
      const id = `u-${uuidv4().substring(0, 8)}`;
      let roleObj = memRoles.User;
      if (data.role?.connect?.id) {
        const found = Object.values(memRoles).find((r) => r.id === data.role.connect.id);
        if (found) roleObj = found;
      }
      const newUser = {
        id,
        email: data.email,
        passwordHash: data.passwordHash,
        firstName: data.firstName,
        lastName: data.lastName,
        isEmailVerified: data.isEmailVerified || false,
        isActive: data.isActive ?? true,
        roleId: roleObj.id,
        role: roleObj,
        failedLoginAttempts: 0,
        lockoutUntil: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      memUsers.set(id, newUser);
      return newUser;
    }
  }

  async update(id: string, data: any) {
    try {
      return await prisma.user.update({
        where: { id },
        data,
        include: {
          role: true,
        },
      });
    } catch {
      const user = memUsers.get(id);
      if (user) {
        if (data.firstName) user.firstName = data.firstName;
        if (data.lastName) user.lastName = data.lastName;
        if (data.passwordHash) user.passwordHash = data.passwordHash;
        if (data.isEmailVerified !== undefined) user.isEmailVerified = data.isEmailVerified;
        if (data.isActive !== undefined) user.isActive = data.isActive;
        if (data.role?.connect?.id) {
          const found = Object.values(memRoles).find((r) => r.id === data.role.connect.id);
          if (found) {
            user.roleId = found.id;
            user.role = found;
          }
        }
        user.updatedAt = new Date();
      }
      return user;
    }
  }

  async incrementFailedLogin(id: string, lockoutUntil?: Date) {
    try {
      return await prisma.user.update({
        where: { id },
        data: {
          failedLoginAttempts: { increment: 1 },
          ...(lockoutUntil ? { lockoutUntil } : {}),
        },
      });
    } catch {
      const user = memUsers.get(id);
      if (user) {
        user.failedLoginAttempts += 1;
        if (lockoutUntil) user.lockoutUntil = lockoutUntil;
      }
      return user;
    }
  }

  async resetFailedLogin(id: string) {
    try {
      return await prisma.user.update({
        where: { id },
        data: {
          failedLoginAttempts: 0,
          lockoutUntil: null,
        },
      });
    } catch {
      const user = memUsers.get(id);
      if (user) {
        user.failedLoginAttempts = 0;
        user.lockoutUntil = null;
      }
      return user;
    }
  }

  async findAll(params: { page?: number; limit?: number; search?: string }) {
    const page = params.page || 1;
    const limit = params.limit || 10;

    try {
      const skip = (page - 1) * limit;
      const where: any = params.search
        ? {
            OR: [
              { email: { contains: params.search, mode: 'insensitive' } },
              { firstName: { contains: params.search, mode: 'insensitive' } },
              { lastName: { contains: params.search, mode: 'insensitive' } },
            ],
          }
        : {};

      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            role: true,
          },
        }),
        prisma.user.count({ where }),
      ]);

      return { users, total, page, limit, totalPages: Math.ceil(total / limit) };
    } catch {
      let allUsers = Array.from(memUsers.values());
      if (params.search) {
        const s = params.search.toLowerCase();
        allUsers = allUsers.filter(
          (u) =>
            u.email.toLowerCase().includes(s) ||
            u.firstName.toLowerCase().includes(s) ||
            u.lastName.toLowerCase().includes(s)
        );
      }
      const total = allUsers.length;
      const skip = (page - 1) * limit;
      const users = allUsers.slice(skip, skip + limit);
      return { users, total, page, limit, totalPages: Math.ceil(total / limit) };
    }
  }
}

export const userRepository = new UserRepository();
