import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting AuthForge database seeding...');

  // 1. Create Permissions
  const permissionNames = [
    'USER_READ',
    'USER_UPDATE',
    'USER_DELETE',
    'PROJECT_READ',
    'PROJECT_WRITE',
    'AUDIT_READ',
    'API_MANAGE',
    'GATEWAY_MANAGE',
    'ROLE_MANAGE',
  ];

  const permissionsMap: Record<string, string> = {};

  for (const name of permissionNames) {
    const perm = await prisma.permission.upsert({
      where: { name },
      update: {},
      create: {
        name,
        description: `Permission to execute ${name} operations`,
      },
    });
    permissionsMap[name] = perm.id;
  }
  console.log('✅ Permissions seeded.');

  // 2. Create Roles
  const rolesData = [
    {
      name: 'SuperAdmin',
      description: 'Super Administrator with full platform privileges',
      permissions: permissionNames,
    },
    {
      name: 'Admin',
      description: 'Administrator with user and project management privileges',
      permissions: ['USER_READ', 'USER_UPDATE', 'PROJECT_READ', 'PROJECT_WRITE', 'AUDIT_READ', 'API_MANAGE'],
    },
    {
      name: 'Developer',
      description: 'Developer user with project access and API key creation privileges',
      permissions: ['PROJECT_READ', 'PROJECT_WRITE', 'API_MANAGE'],
    },
    {
      name: 'User',
      description: 'Standard end user with default read privileges',
      permissions: ['PROJECT_READ'],
    },
  ];

  const rolesMap: Record<string, string> = {};

  for (const roleDef of rolesData) {
    const role = await prisma.role.upsert({
      where: { name: roleDef.name },
      update: { description: roleDef.description },
      create: {
        name: roleDef.name,
        description: roleDef.description,
      },
    });
    rolesMap[roleDef.name] = role.id;

    // Link Role Permissions
    for (const permName of roleDef.permissions) {
      const permId = permissionsMap[permName];
      if (permId) {
        await prisma.rolePermission.upsert({
          where: {
            roleId_permissionId: {
              roleId: role.id,
              permissionId: permId,
            },
          },
          update: {},
          create: {
            roleId: role.id,
            permissionId: permId,
          },
        });
      }
    }
  }
  console.log('✅ Roles and RolePermissions seeded.');

  // 3. Create Default Users
  const passwordHash = await bcrypt.hash('Admin@123456', 10);
  const userPasswordHash = await bcrypt.hash('User@123456', 10);

  const superAdmin = await prisma.user.upsert({
    where: { email: 'admin@authforge.io' },
    update: {},
    create: {
      email: 'admin@authforge.io',
      passwordHash,
      firstName: 'AuthForge',
      lastName: 'Admin',
      isEmailVerified: true,
      isActive: true,
      roleId: rolesMap['SuperAdmin'],
    },
  });

  const devUser = await prisma.user.upsert({
    where: { email: 'dev@authforge.io' },
    update: {},
    create: {
      email: 'dev@authforge.io',
      passwordHash: userPasswordHash,
      firstName: 'DevFlow',
      lastName: 'Developer',
      isEmailVerified: true,
      isActive: true,
      roleId: rolesMap['Developer'],
    },
  });

  const standardUser = await prisma.user.upsert({
    where: { email: 'user@authforge.io' },
    update: {},
    create: {
      email: 'user@authforge.io',
      passwordHash: userPasswordHash,
      firstName: 'Standard',
      lastName: 'User',
      isEmailVerified: true,
      isActive: true,
      roleId: rolesMap['User'],
    },
  });

  console.log('✅ Default users seeded (admin@authforge.io, dev@authforge.io, user@authforge.io).');

  // 4. Create Gateway Routes
  await prisma.gatewayRoute.upsert({
    where: { pathPrefix: '/gateway/projects' },
    update: {},
    create: {
      pathPrefix: '/gateway/projects',
      targetUrl: 'http://localhost:4000/api/v1/mock/projects',
      requireAuth: true,
      requiredPermissions: ['PROJECT_READ'],
      rateLimitEnabled: true,
      rateLimitRequests: 100,
      rateLimitWindowSeconds: 60,
      isActive: true,
    },
  });

  await prisma.gatewayRoute.upsert({
    where: { pathPrefix: '/gateway/users' },
    update: {},
    create: {
      pathPrefix: '/gateway/users',
      targetUrl: 'http://localhost:4000/api/v1/mock/users',
      requireAuth: true,
      requiredPermissions: ['USER_READ'],
      rateLimitEnabled: true,
      rateLimitRequests: 60,
      rateLimitWindowSeconds: 60,
      isActive: true,
    },
  });

  console.log('✅ Gateway routes seeded.');
  console.log('🎉 Seeding complete!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
