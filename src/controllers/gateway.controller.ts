import { Request, Response, NextFunction } from 'express';
import { gatewayService } from '../services/gateway.service.js';
import { createGatewayRouteSchema, updateGatewayRouteSchema } from '../validators/gateway.validator.js';
import { sendSuccess } from '../utils/response.js';

export class GatewayController {
  async getAllRoutes(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const routes = await gatewayService.getAllRoutes();
      sendSuccess(res, routes, 200);
    } catch (error) {
      next(error);
    }
  }

  async createRoute(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validatedData = createGatewayRouteSchema.parse(req.body);
      const route = await gatewayService.createRoute(validatedData);
      sendSuccess(res, route, 201);
    } catch (error) {
      next(error);
    }
  }

  async updateRoute(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const validatedData = updateGatewayRouteSchema.parse(req.body);
      const route = await gatewayService.updateRoute(id, validatedData);
      sendSuccess(res, route, 200);
    } catch (error) {
      next(error);
    }
  }

  async deleteRoute(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      await gatewayService.deleteRoute(id);
      sendSuccess(res, { message: 'Gateway route deleted successfully' }, 200);
    } catch (error) {
      next(error);
    }
  }
}

export const gatewayController = new GatewayController();
