import { Router } from 'express';
import { apiKeyController } from '../controllers/apiKey.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requirePermission } from '../middleware/rbac.middleware.js';

const router = Router();

router.use(authenticate);

router.get('/', (req, res, next) => apiKeyController.getUserApiKeys(req, res, next));
router.post('/', requirePermission('API_MANAGE'), (req, res, next) => apiKeyController.createApiKey(req, res, next));
router.delete('/:id', requirePermission('API_MANAGE'), (req, res, next) => apiKeyController.revokeApiKey(req, res, next));

export default router;
