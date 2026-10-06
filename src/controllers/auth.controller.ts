import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service.js';
import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyEmailSchema,
} from '../validators/auth.validator.js';
import { sendSuccess } from '../utils/response.js';

export class AuthController {
  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validatedData = registerSchema.parse(req.body);
      const result = await authService.register(validatedData, req.ip, req.get('user-agent'));
      sendSuccess(res, result, 201);
    } catch (error) {
      next(error);
    }
  }

  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validatedData = loginSchema.parse(req.body);
      const userAgent = req.get('user-agent') || 'Unknown';
      const deviceType = userAgent.includes('Mobile') ? 'Mobile' : 'Desktop';

      const result = await authService.login(validatedData, req.ip, userAgent, deviceType);

      // Set Refresh Token in httpOnly Cookie
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

  async refreshToken(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const rawBodyToken = req.body?.refreshToken;
      const cookieToken = req.cookies?.refreshToken;
      const token = rawBodyToken || cookieToken;

      const validated = refreshTokenSchema.parse({ refreshToken: token });
      const result = await authService.refreshToken(validated.refreshToken!, req.ip, req.get('user-agent'));

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

  async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (req.sessionId && req.user) {
        await authService.logout(req.sessionId, req.user.id, req.ip, req.get('user-agent'));
      }
      res.clearCookie('refreshToken');
      sendSuccess(res, { message: 'Logged out successfully' }, 200);
    } catch (error) {
      next(error);
    }
  }

  async logoutAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) return;
      const result = await authService.logoutAll(req.user.id, req.ip, req.get('user-agent'));
      res.clearCookie('refreshToken');
      sendSuccess(res, result, 200);
    } catch (error) {
      next(error);
    }
  }

  async forgotPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validatedData = forgotPasswordSchema.parse(req.body);
      const result = await authService.forgotPassword(validatedData.email, req.ip, req.get('user-agent'));
      sendSuccess(res, result, 200);
    } catch (error) {
      next(error);
    }
  }

  async resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validatedData = resetPasswordSchema.parse(req.body);
      const result = await authService.resetPassword(
        validatedData.token,
        validatedData.newPassword,
        req.ip,
        req.get('user-agent')
      );
      sendSuccess(res, result, 200);
    } catch (error) {
      next(error);
    }
  }

  async verifyEmail(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validatedData = verifyEmailSchema.parse(req.body);
      const result = await authService.verifyEmail(validatedData.token);
      sendSuccess(res, result, 200);
    } catch (error) {
      next(error);
    }
  }
}

export const authController = new AuthController();
