import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

export const memPermissions: Record<string, { id: string; name: string; description: string }> = {
  USER_READ: { id: 'p-1', name: 'USER_READ', description: 'View users' },
  USER_UPDATE: { id: 'p-2', name: 'USER_UPDATE', description: 'Update users' },
  USER_DELETE: { id: 'p-3', name: 'USER_DELETE', description: 'Delete users' },
  PROJECT_READ: { id: 'p-4', name: 'PROJECT_READ', description: 'Read projects' },
  PROJECT_WRITE: { id: 'p-5', name: 'PROJECT_WRITE', description: 'Write projects' },
  AUDIT_READ: { id: 'p-6', name: 'AUDIT_READ', description: 'Read audit logs' },
  API_MANAGE: { id: 'p-7', name: 'API_MANAGE', description: 'Manage API keys' },
  GATEWAY_MANAGE: { id: 'p-8', name: 'GATEWAY_MANAGE', description: 'Manage Gateway routes' },
  ROLE_MANAGE: { id: 'p-9', name: 'ROLE_MANAGE', description: 'Manage roles' },
};

export const memRoles: Record<string, { id: string; name: string; description: string; permissions: any[] }> = {
  SuperAdmin: {
    id: 'r-superadmin',
    name: 'SuperAdmin',
    description: 'Super Administrator',
    permissions: Object.values(memPermissions).map((p) => ({ permission: p })),
  },
  Admin: {
    id: 'r-admin',
    name: 'Admin',
    description: 'Administrator',
    permissions: [
      memPermissions.USER_READ,
      memPermissions.USER_UPDATE,
      memPermissions.PROJECT_READ,
      memPermissions.PROJECT_WRITE,
      memPermissions.AUDIT_READ,
      memPermissions.API_MANAGE,
    ].map((p) => ({ permission: p })),
  },
  Developer: {
    id: 'r-developer',
    name: 'Developer',
    description: 'Developer User',
    permissions: [
      memPermissions.PROJECT_READ,
      memPermissions.PROJECT_WRITE,
      memPermissions.API_MANAGE,
    ].map((p) => ({ permission: p })),
  },
  User: {
    id: 'r-user',
    name: 'User',
    description: 'Standard User',
    permissions: [memPermissions.PROJECT_READ].map((p) => ({ permission: p })),
  },
};

const adminPasswordHash = bcrypt.hashSync('Admin@123456', 10);
const userPasswordHash = bcrypt.hashSync('User@123456', 10);

export const memUsers: Map<string, any> = new Map([
  [
    'u-admin',
    {
      id: 'u-admin',
      email: 'admin@authforge.io',
      passwordHash: adminPasswordHash,
      firstName: 'AuthForge',
      lastName: 'Admin',
      isEmailVerified: true,
      isActive: true,
      roleId: memRoles.SuperAdmin.id,
      role: memRoles.SuperAdmin,
      failedLoginAttempts: 0,
      lockoutUntil: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ],
  [
    'u-dev',
    {
      id: 'u-dev',
      email: 'dev@authforge.io',
      passwordHash: userPasswordHash,
      firstName: 'DevFlow',
      lastName: 'Developer',
      isEmailVerified: true,
      isActive: true,
      roleId: memRoles.Developer.id,
      role: memRoles.Developer,
      failedLoginAttempts: 0,
      lockoutUntil: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ],
  [
    'u-user',
    {
      id: 'u-user',
      email: 'user@authforge.io',
      passwordHash: userPasswordHash,
      firstName: 'Standard',
      lastName: 'User',
      isEmailVerified: true,
      isActive: true,
      roleId: memRoles.User.id,
      role: memRoles.User,
      failedLoginAttempts: 0,
      lockoutUntil: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ],
]);

export const memSessions: Map<string, any> = new Map();
export const memRefreshTokens: Map<string, any> = new Map();
export const memApiKeys: Map<string, any> = new Map();
export const memAuditLogs: any[] = [];
export const memGatewayRoutes: Map<string, any> = new Map([
  [
    'gw-1',
    {
      id: 'gw-1',
      pathPrefix: '/gateway/projects',
      targetUrl: 'http://localhost:4000/api/v1/mock/projects',
      requireAuth: true,
      requiredPermissions: ['PROJECT_READ'],
      rateLimitEnabled: true,
      rateLimitRequests: 100,
      rateLimitWindowSeconds: 60,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ],
  [
    'gw-2',
    {
      id: 'gw-2',
      pathPrefix: '/gateway/users',
      targetUrl: 'http://localhost:4000/api/v1/mock/users',
      requireAuth: true,
      requiredPermissions: ['USER_READ'],
      rateLimitEnabled: true,
      rateLimitRequests: 60,
      rateLimitWindowSeconds: 60,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ],
]);
