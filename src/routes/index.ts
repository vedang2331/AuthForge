import { Router } from 'express';
import authRoutes from './auth.routes.js';
import userRoutes from './user.routes.js';
import sessionRoutes from './session.routes.js';
import apiKeyRoutes from './apiKey.routes.js';
import auditRoutes from './audit.routes.js';
import gatewayRoutes from './gateway.routes.js';
import mockRoutes from './mock.routes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/sessions', sessionRoutes);
router.use('/api-keys', apiKeyRoutes);
router.use('/audit-logs', auditRoutes);
router.use('/gateway-routes', gatewayRoutes);
router.use('/mock', mockRoutes);

export default router;
