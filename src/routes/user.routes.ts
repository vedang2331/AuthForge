import { Router } from 'express';
import { userController } from '../controllers/user.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requirePermission, requireRole } from '../middleware/rbac.middleware.js';

const router = Router();

router.use(authenticate);

// Profile endpoints (Authenticated users)
router.get('/me', (req, res, next) => userController.getProfile(req, res, next));
router.patch('/me', (req, res, next) => userController.updateProfile(req, res, next));
router.patch('/me/change-password', (req, res, next) => userController.changePassword(req, res, next));

// Admin User Management endpoints
router.get('/', requirePermission('USER_READ'), (req, res, next) => userController.getAllUsers(req, res, next));
router.patch('/:id/status', requirePermission('USER_UPDATE'), (req, res, next) => userController.updateUserStatus(req, res, next));
router.patch('/:id/role', requireRole('SuperAdmin', 'Admin'), (req, res, next) => userController.updateUserRole(req, res, next));

export default router;
