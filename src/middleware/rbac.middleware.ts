import { Request, Response, NextFunction } from 'express';
import { ForbiddenError, UnauthorizedError } from '../utils/errors.js';

export function requirePermission(...permissions: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new UnauthorizedError('User authentication required'));
    }

    if (req.user.role === 'SuperAdmin') {
      return next(); // SuperAdmin bypasses permission restrictions
    }

    const userPermissions = req.user.permissions || [];
    const hasAllPermissions = permissions.every((p) => userPermissions.includes(p));

    if (!hasAllPermissions) {
      return next(
        new ForbiddenError(
          `Access denied. Required permission(s): [${permissions.join(', ')}]`,
          'PERMISSION_DENIED'
        )
      );
    }

    next();
  };
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new UnauthorizedError('User authentication required'));
    }

    if (req.user.role === 'SuperAdmin') {
      return next();
    }

    if (!roles.includes(req.user.role)) {
      return next(
        new ForbiddenError(
          `Access denied. Required role(s): [${roles.join(', ')}]`,
          'ROLE_NOT_AUTHORIZED'
        )
      );
    }

    next();
  };
}
