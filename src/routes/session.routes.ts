import { Router } from 'express';
import { sessionController } from '../controllers/session.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = Router();

router.use(authenticate);

router.get('/', (req, res, next) => sessionController.getUserSessions(req, res, next));
router.delete('/:id', (req, res, next) => sessionController.revokeSession(req, res, next));

export default router;
