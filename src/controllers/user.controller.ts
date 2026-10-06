import { Request, Response, NextFunction } from 'express';
import { userService } from '../services/user.service.js';
import {
  updateProfileSchema,
  changePasswordSchema,
  updateUserStatusSchema,
  updateUserRoleSchema,
} from '../validators/user.validator.js';
import { sendSuccess } from '../utils/response.js';

export class UserController {
  async getProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await userService.getProfile(req.user!.id);
      sendSuccess(res, result, 200);
    } catch (error) {
      next(error);
    }
  }

  async updateProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validatedData = updateProfileSchema.parse(req.body);
      const result = await userService.updateProfile(req.user!.id, validatedData);
      sendSuccess(res, result, 200);
    } catch (error) {
      next(error);
    }
  }

  async changePassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validatedData = changePasswordSchema.parse(req.body);
      const result = await userService.changePassword(
        req.user!.id,
        validatedData,
        req.ip,
        req.get('user-agent')
      );
      sendSuccess(res, result, 200);
    } catch (error) {
      next(error);
    }
  }

  async getAllUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;
      const search = req.query.search as string | undefined;

      const result = await userService.getAllUsers({ page, limit, search });
      sendSuccess(res, result.users, 200, {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateUserStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const validatedData = updateUserStatusSchema.parse(req.body);
      const result = await userService.updateUserStatus(
        id,
        validatedData.isActive,
        req.user!.id,
        req.ip,
        req.get('user-agent')
      );
      sendSuccess(res, result, 200);
    } catch (error) {
      next(error);
    }
  }

  async updateUserRole(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const validatedData = updateUserRoleSchema.parse(req.body);
      const result = await userService.updateUserRole(
        id,
        validatedData.roleName,
        req.user!.id,
        req.ip,
        req.get('user-agent')
      );
      sendSuccess(res, result, 200);
    } catch (error) {
      next(error);
    }
  }
}

export const userController = new UserController();
