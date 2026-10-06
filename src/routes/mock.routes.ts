import { Router } from 'express';
import { mockController } from '../controllers/mock.controller.js';

const router = Router();

router.get('/projects', (req, res) => mockController.getProjects(req, res));
router.get('/users', (req, res) => mockController.getUsers(req, res));

export default router;
