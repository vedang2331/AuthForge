import { Request, Response, NextFunction } from 'express';
import { gatewayRepository } from '../repositories/gateway.repository.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requirePermission } from '../middleware/rbac.middleware.js';
import { createRateLimiter } from '../middleware/rateLimiter.middleware.js';
import { NotFoundError, ForbiddenError } from '../utils/errors.js';
import { logger } from '../logging/logger.js';

export async function gatewayMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const fullPath = req.originalUrl;
    const matchPrefix = fullPath.split('?')[0];

    // Find matching registered gateway route
    const routes = await gatewayRepository.findAllActive();
    const targetRoute = routes.find((r: any) => matchPrefix.startsWith(r.pathPrefix));

    if (!targetRoute) {
      throw new NotFoundError(`No registered gateway route matching path '${matchPrefix}'`);
    }

    logger.info(`[GATEWAY] Match found: ${targetRoute.pathPrefix} -> ${targetRoute.targetUrl}`);

    // Step 1: Auth check
    if (targetRoute.requireAuth) {
      await new Promise<void>((resolve, reject) => {
        authenticate(req, res, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    }

    // Step 2: Permission check
    if (targetRoute.requiredPermissions && targetRoute.requiredPermissions.length > 0) {
      if (req.user?.role !== 'SuperAdmin') {
        const userPerms = req.user?.permissions || [];
        const hasAll = targetRoute.requiredPermissions.every((p: string) => userPerms.includes(p));
        if (!hasAll) {
          throw new ForbiddenError(
            `Gateway Auth Failed: Required permission(s) [${targetRoute.requiredPermissions.join(', ')}] missing`
          );
        }
      }
    }

    // Step 3: Rate Limiting
    if (targetRoute.rateLimitEnabled) {
      const limiter = createRateLimiter({
        keyPrefix: `gateway:${targetRoute.id}`,
        maxRequests: targetRoute.rateLimitRequests,
        windowSeconds: targetRoute.rateLimitWindowSeconds,
      });

      await new Promise<void>((resolve, reject) => {
        limiter(req, res, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    }

    // Step 4: Proxy Forwarding to Target Service
    const relativeSubpath = matchPrefix.replace(targetRoute.pathPrefix, '');
    const queryString = req.originalUrl.includes('?') ? req.originalUrl.substring(req.originalUrl.indexOf('?')) : '';
    const targetEndpoint = `${targetRoute.targetUrl.replace(/\/$/, '')}${relativeSubpath}${queryString}`;

    const headers: Record<string, string> = {
      'content-type': req.get('content-type') || 'application/json',
      'x-forwarded-for': req.ip || '',
      'x-request-id': req.requestId || '',
    };

    if (req.user) {
      headers['x-user-id'] = req.user.id;
      headers['x-user-email'] = req.user.email;
      headers['x-user-role'] = req.user.role;
    }

    const fetchOptions: RequestInit = {
      method: req.method,
      headers,
    };

    if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.body && Object.keys(req.body).length > 0) {
      fetchOptions.body = JSON.stringify(req.body);
    }

    const upstreamRes = await fetch(targetEndpoint, fetchOptions);
    const contentType = upstreamRes.headers.get('content-type') || '';

    res.status(upstreamRes.status);
    if (contentType.includes('application/json')) {
      const json = await upstreamRes.json();
      res.json(json);
    } else {
      const text = await upstreamRes.text();
      res.send(text);
    }
  } catch (error) {
    next(error);
  }
}
