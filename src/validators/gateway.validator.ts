import { z } from 'zod';

export const createGatewayRouteSchema = z.object({
  pathPrefix: z.string().startsWith('/gateway/', 'Path prefix must start with /gateway/'),
  targetUrl: z.string().url('Target URL must be a valid URL'),
  requireAuth: z.boolean().default(true),
  requiredPermissions: z.array(z.string()).default([]),
  rateLimitEnabled: z.boolean().default(true),
  rateLimitRequests: z.number().int().positive().default(100),
  rateLimitWindowSeconds: z.number().int().positive().default(60),
});

export const updateGatewayRouteSchema = createGatewayRouteSchema.partial();
