import { gatewayRepository } from '../repositories/gateway.repository.js';
import { NotFoundError, ConflictError } from '../utils/errors.js';

export class GatewayService {
  async getAllRoutes() {
    return gatewayRepository.findAllActive();
  }

  async getRouteByPrefix(pathPrefix: string) {
    return gatewayRepository.findByPathPrefix(pathPrefix);
  }

  async createRoute(data: {
    pathPrefix: string;
    targetUrl: string;
    requireAuth?: boolean;
    requiredPermissions?: string[];
    rateLimitEnabled?: boolean;
    rateLimitRequests?: number;
    rateLimitWindowSeconds?: number;
  }) {
    const existing = await gatewayRepository.findByPathPrefix(data.pathPrefix);
    if (existing) {
      throw new ConflictError(`Gateway route prefix '${data.pathPrefix}' already exists`);
    }

    return gatewayRepository.create({
      pathPrefix: data.pathPrefix,
      targetUrl: data.targetUrl,
      requireAuth: data.requireAuth ?? true,
      requiredPermissions: data.requiredPermissions || [],
      rateLimitEnabled: data.rateLimitEnabled ?? true,
      rateLimitRequests: data.rateLimitRequests ?? 100,
      rateLimitWindowSeconds: data.rateLimitWindowSeconds ?? 60,
    });
  }

  async updateRoute(
    id: string,
    data: Partial<{
      pathPrefix: string;
      targetUrl: string;
      requireAuth: boolean;
      requiredPermissions: string[];
      rateLimitEnabled: boolean;
      rateLimitRequests: number;
      rateLimitWindowSeconds: number;
      isActive: boolean;
    }>
  ) {
    return gatewayRepository.update(id, data);
  }

  async deleteRoute(id: string) {
    return gatewayRepository.delete(id);
  }
}

export const gatewayService = new GatewayService();
