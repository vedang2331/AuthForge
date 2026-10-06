import { Request, Response, NextFunction } from 'express';
import { auditService } from '../audit/audit.service.js';
import { sendSuccess } from '../utils/response.js';

export class AuditController {
  async getLogs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
      const userId = req.query.userId as string | undefined;
      const action = req.query.action as string | undefined;

      const result = await auditService.getLogs({ page, limit, userId, action });
      sendSuccess(res, result.logs, 200, {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const auditController = new AuditController();
