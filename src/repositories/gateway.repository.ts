import { prisma } from './prisma.js';
import { memGatewayRoutes } from './memdb.js';
import { v4 as uuidv4 } from 'uuid';

export class GatewayRepository {
  async findByPathPrefix(pathPrefix: string) {
    try {
      return await prisma.gatewayRoute.findUnique({
        where: { pathPrefix },
      });
    } catch {
      for (const r of memGatewayRoutes.values()) {
        if (r.pathPrefix === pathPrefix) return r;
      }
      return null;
    }
  }

  async findAllActive() {
    try {
      return await prisma.gatewayRoute.findMany({
        where: { isActive: true },
        orderBy: { pathPrefix: 'desc' },
      });
    } catch {
      return Array.from(memGatewayRoutes.values()).filter((r) => r.isActive);
    }
  }

  async create(data: any) {
    try {
      return await prisma.gatewayRoute.create({
        data,
      });
    } catch {
      const id = `gw-${uuidv4().substring(0, 8)}`;
      const route = {
        id,
        pathPrefix: data.pathPrefix,
        targetUrl: data.targetUrl,
        requireAuth: data.requireAuth ?? true,
        requiredPermissions: data.requiredPermissions || [],
        rateLimitEnabled: data.rateLimitEnabled ?? true,
        rateLimitRequests: data.rateLimitRequests ?? 100,
        rateLimitWindowSeconds: data.rateLimitWindowSeconds ?? 60,
        isActive: data.isActive ?? true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      memGatewayRoutes.set(id, route);
      return route;
    }
  }

  async update(id: string, data: any) {
    try {
      return await prisma.gatewayRoute.update({
        where: { id },
        data,
      });
    } catch {
      const r = memGatewayRoutes.get(id);
      if (r) {
        Object.assign(r, data, { updatedAt: new Date() });
      }
      return r;
    }
  }

  async delete(id: string) {
    try {
      return await prisma.gatewayRoute.delete({
        where: { id },
      });
    } catch {
      const r = memGatewayRoutes.get(id);
      memGatewayRoutes.delete(id);
      return r;
    }
  }
}

export const gatewayRepository = new GatewayRepository();
