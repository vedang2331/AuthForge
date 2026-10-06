import { Router } from 'express';
import { gatewayController } from '../controllers/gateway.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requirePermission } from '../middleware/rbac.middleware.js';

const router = Router();

router.use(authenticate);
router.use(requirePermission('GATEWAY_MANAGE'));

router.get('/', (req, res, next) => gatewayController.getAllRoutes(req, res, next));
router.post('/', (req, res, next) => gatewayController.createRoute(req, res, next));
router.patch('/:id', (req, res, next) => gatewayController.updateRoute(req, res, next));
router.delete('/:id', (req, res, next) => gatewayController.deleteRoute(req, res, next));

export default router;
