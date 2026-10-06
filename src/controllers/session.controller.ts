import { Request, Response, NextFunction } from 'express';
import { sessionService } from '../services/session.service.js';
import { sendSuccess } from '../utils/response.js';

export class SessionController {
  async getUserSessions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const sessions = await sessionService.getUserSessions(req.user!.id, req.sessionId);
      sendSuccess(res, sessions, 200);
    } catch (error) {
      next(error);
    }
  }

  async revokeSession(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const result = await sessionService.revokeSession(id, req.user!.id, req.ip, req.get('user-agent'));
      sendSuccess(res, result, 200);
    } catch (error) {
      next(error);
    }
  }
}

export const sessionController = new SessionController();
