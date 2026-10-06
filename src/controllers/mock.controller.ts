import { Request, Response } from 'express';
import { sendSuccess } from '../utils/response.js';

export class MockController {
  getProjects(req: Request, res: Response): void {
    const mockProjects = [
      { id: 'proj-1', name: 'DevFlow Production Suite', status: 'ACTIVE', createdAt: '2026-01-15' },
      { id: 'proj-2', name: 'AuthForge IAM Platform', status: 'ACTIVE', createdAt: '2026-03-01' },
      { id: 'proj-3', name: 'Analytics Pipeline', status: 'PAUSED', createdAt: '2026-05-10' },
    ];
    sendSuccess(res, {
      service: 'project-service',
      forwardedUser: req.user ? req.user.email : 'Anonymous',
      projects: mockProjects,
    });
  }

  getUsers(req: Request, res: Response): void {
    const mockServiceUsers = [
      { id: 'usr-101', username: 'alice_dev', role: 'Developer' },
      { id: 'usr-102', username: 'bob_admin', role: 'Admin' },
    ];
    sendSuccess(res, {
      service: 'user-service',
      forwardedUser: req.user ? req.user.email : 'Anonymous',
      users: mockServiceUsers,
    });
  }
}

export const mockController = new MockController();
