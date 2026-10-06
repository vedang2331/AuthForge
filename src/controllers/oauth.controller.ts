import { Request, Response, NextFunction } from 'express';
import { oauthService } from '../services/oauth.service.js';
import { sendSuccess } from '../utils/response.js';

export class OAuthController {
  getOAuthUrl(req: Request, res: Response, next: NextFunction): void {
    try {
      const { provider } = req.params as { provider: 'google' | 'github' };
      const result = oauthService.getOAuthUrl(provider);
      sendSuccess(res, result, 200);
    } catch (error) {
      next(error);
    }
  }

  async handleCallback(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { provider } = req.params as { provider: 'google' | 'github' };
      const code = (req.query.code as string) || (req.body?.code as string);
      const mockProfile = req.body?.mockProfile;

      const result = await oauthService.handleOAuthCallback(
        provider,
        code,
        mockProfile,
        req.ip,
        req.get('user-agent')
      );

      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      sendSuccess(res, result, 200);
    } catch (error) {
      next(error);
    }
  }
}

export const oauthController = new OAuthController();
