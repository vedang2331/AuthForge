import { Request, Response, NextFunction } from 'express';
import { redis } from '../cache/redis.js';
import { TooManyRequestsError } from '../utils/errors.js';
import { auditService } from '../audit/audit.service.js';
import { AuditActions } from '../audit/audit.constants.js';

export interface RateLimiterOptions {
  keyPrefix: string;
  maxRequests: number;
  windowSeconds: number;
  identifierFn?: (req: Request) => string;
}

export function createRateLimiter(options: RateLimiterOptions) {
  const { keyPrefix, maxRequests, windowSeconds, identifierFn } = options;

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const identifier = identifierFn ? identifierFn(req) : (req.user?.id || req.ip || 'anonymous');
      const redisKey = `rate:${keyPrefix}:${identifier}`;

      const currentCount = await redis.incr(redisKey);

      if (currentCount === 1) {
        await redis.expire(redisKey, windowSeconds);
      }

      const remaining = Math.max(0, maxRequests - currentCount);

      res.setHeader('X-RateLimit-Limit', maxRequests);
      res.setHeader('X-RateLimit-Remaining', remaining);
      res.setHeader('X-RateLimit-Reset', Math.ceil(Date.now() / 1000) + windowSeconds);

      if (currentCount > maxRequests) {
        res.setHeader('Retry-After', windowSeconds);

        await auditService.logEvent({
          action: AuditActions.RATE_LIMIT_EXCEEDED,
          userId: req.user?.id,
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
          metadata: { keyPrefix, identifier, currentCount, maxRequests },
        });

        throw new TooManyRequestsError(
          `Rate limit exceeded. Maximum ${maxRequests} requests per ${windowSeconds} seconds allowed.`
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}
