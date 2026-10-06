import { prisma } from './prisma.js';
import { memRoles } from './memdb.js';

export class RoleRepository {
  async findByName(name: string) {
    try {
      return await prisma.role.findUnique({
        where: { name },
        include: {
          permissions: {
            include: {
              permission: true,
            },
          },
        },
      });
    } catch {
      return memRoles[name] || null;
    }
  }

  async findById(id: string) {
    try {
      return await prisma.role.findUnique({
        where: { id },
        include: {
          permissions: {
            include: {
              permission: true,
            },
          },
        },
      });
    } catch {
      return Object.values(memRoles).find((r) => r.id === id) || null;
    }
  }

  async findAll() {
    try {
      return await prisma.role.findMany({
        include: {
          permissions: {
            include: {
              permission: true,
            },
          },
        },
      });
    } catch {
      return Object.values(memRoles);
    }
  }
}

export const roleRepository = new RoleRepository();
