import { userRepository } from '../repositories/user.repository.js';
import { roleRepository } from '../repositories/role.repository.js';
import { sessionRepository } from '../repositories/session.repository.js';
import { hashPassword, comparePassword } from '../security/hash.js';
import { auditService } from '../audit/audit.service.js';
import { AuditActions } from '../audit/audit.constants.js';
import { BadRequestError, NotFoundError } from '../utils/errors.js';

export class UserService {
  async getProfile(userId: string) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    const permissions = user.role.permissions.map((rp: any) => rp.permission.name);

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      isEmailVerified: user.isEmailVerified,
      isActive: user.isActive,
      role: user.role.name,
      permissions,
      createdAt: user.createdAt,
    };
  }

  async updateProfile(userId: string, data: { firstName?: string; lastName?: string }) {
    const user = await userRepository.update(userId, data);
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
    };
  }

  async changePassword(userId: string, data: { currentPassword: string; newPassword: string }, ip?: string, userAgent?: string) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    const isMatch = await comparePassword(data.currentPassword, user.passwordHash);
    if (!isMatch) {
      throw new BadRequestError('Current password is incorrect');
    }

    const newHash = await hashPassword(data.newPassword);
    await userRepository.update(userId, { passwordHash: newHash });

    await auditService.logEvent({
      action: AuditActions.PASSWORD_CHANGED,
      userId,
      ipAddress: ip,
      userAgent,
    });

    return { message: 'Password changed successfully' };
  }

  async getAllUsers(params: { page?: number; limit?: number; search?: string }) {
    const result = await userRepository.findAll(params);
    const sanitizedUsers = result.users.map((u: any) => ({
      id: u.id,
      email: u.email,
      firstName: u.firstName,
      lastName: u.lastName,
      role: u.role.name,
      isActive: u.isActive,
      isEmailVerified: u.isEmailVerified,
      createdAt: u.createdAt,
    }));

    return { ...result, users: sanitizedUsers };
  }

  async updateUserStatus(userId: string, isActive: boolean, adminUserId: string, ip?: string, userAgent?: string) {
    const user = await userRepository.update(userId, { isActive });
    if (!isActive) {
      // Revoke sessions if account disabled
      await sessionRepository.revokeAllUserSessions(userId);
    }

    await auditService.logEvent({
      action: AuditActions.USER_STATUS_CHANGED,
      userId: adminUserId,
      ipAddress: ip,
      userAgent,
      metadata: { targetUserId: userId, isActive },
    });

    return { id: user.id, email: user.email, isActive: user.isActive };
  }

  async updateUserRole(userId: string, roleName: string, adminUserId: string, ip?: string, userAgent?: string) {
    const role = await roleRepository.findByName(roleName);
    if (!role) {
      throw new NotFoundError(`Role '${roleName}' not found`);
    }

    const user = await userRepository.update(userId, { role: { connect: { id: role.id } } });

    await auditService.logEvent({
      action: AuditActions.ROLE_CHANGED,
      userId: adminUserId,
      ipAddress: ip,
      userAgent,
      metadata: { targetUserId: userId, newRole: roleName },
    });

    return { id: user.id, email: user.email, role: role.name };
  }
}

export const userService = new UserService();
