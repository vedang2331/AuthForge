import { Router } from 'express';
import { auditController } from '../controllers/audit.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requirePermission } from '../middleware/rbac.middleware.js';

const router = Router();

router.use(authenticate);
router.use(requirePermission('AUDIT_READ'));

router.get('/', (req, res, next) => auditController.getLogs(req, res, next));

export default router;
