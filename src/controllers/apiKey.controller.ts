import { Request, Response, NextFunction } from 'express';
import { apiKeyService } from '../services/apiKey.service.js';
import { createApiKeySchema } from '../validators/apiKey.validator.js';
import { sendSuccess } from '../utils/response.js';

export class ApiKeyController {
  async createApiKey(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validatedData = createApiKeySchema.parse(req.body);
      const result = await apiKeyService.createApiKey(
        req.user!.id,
        validatedData,
        req.ip,
        req.get('user-agent')
      );
      sendSuccess(res, result, 201);
    } catch (error) {
      next(error);
    }
  }

  async getUserApiKeys(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const keys = await apiKeyService.getUserApiKeys(req.user!.id);
      sendSuccess(res, keys, 200);
    } catch (error) {
      next(error);
    }
  }

  async revokeApiKey(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const result = await apiKeyService.revokeApiKey(id, req.user!.id, req.ip, req.get('user-agent'));
      sendSuccess(res, result, 200);
    } catch (error) {
      next(error);
    }
  }
}

export const apiKeyController = new ApiKeyController();
