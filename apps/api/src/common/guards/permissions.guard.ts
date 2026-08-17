import { type CanActivate, type ExecutionContext, Injectable, Optional } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../database/prisma.service';
import {
  PERMISSIONS_KEY,
  type RequiredPermission,
} from '../decorators/require-permissions.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    @Optional() private reflector?: Reflector,
    @Optional() private prisma?: PrismaService,
  ) {
    if (!this.reflector) {
      this.reflector = new Reflector();
    }
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const reflector = this.reflector || new Reflector();
    const requiredPermissions = reflector.getAllAndOverride<RequiredPermission[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (!user) {
      return false;
    }

    const userRole = String(user.role || user.roleName || '')
      .trim()
      .toUpperCase();

    // Super Admin inherits all permissions unconditionally
    if (userRole === 'SUPER ADMIN' || userRole === 'SUPERADMIN' || userRole === 'SUPER_ADMIN') {
      return true;
    }

    // 1. If permissions array is present in request user payload
    if (Array.isArray(user.permissions) && user.permissions.length > 0) {
      const userPermSet = new Set(
        user.permissions.map((p: unknown) => {
          if (typeof p === 'string') return p.toLowerCase();
          if (typeof p === 'object' && p !== null) {
            const permObj = p as { subject?: string; action?: string };
            return `${permObj.subject || ''}:${permObj.action || ''}`.toLowerCase();
          }
          return '';
        }),
      );

      const hasAll = requiredPermissions.every((req) => {
        const directKey = `${req.subject}:${req.action}`.toLowerCase();
        const wildcardSubjectKey = `${req.subject}:*`.toLowerCase();
        const wildcardAllKey = '*:*';
        return (
          userPermSet.has(directKey) ||
          userPermSet.has(wildcardSubjectKey) ||
          userPermSet.has(wildcardAllKey)
        );
      });

      if (hasAll) return true;
    }

    // 2. Fallback: Query Prisma for user's role permissions if available
    if (this.prisma && (user.id || user.sub)) {
      const userId = user.id || user.sub;
      const userRecord = await this.prisma.user.findUnique({
        where: { id: userId },
        include: {
          role: {
            include: {
              permissions: {
                include: {
                  permission: true,
                },
              },
            },
          },
        },
      });

      if (!userRecord || !userRecord.role) {
        return false;
      }

      if (
        userRecord.role.name.toUpperCase() === 'SUPER ADMIN' ||
        userRecord.role.name.toUpperCase() === 'SUPERADMIN'
      ) {
        return true;
      }

      const rolePerms = userRecord.role.permissions.map((rp) => rp.permission);
      const permSet = new Set(rolePerms.map((p) => `${p.subject}:${p.action}`.toLowerCase()));

      return requiredPermissions.every((req) => {
        const directKey = `${req.subject}:${req.action}`.toLowerCase();
        const wildcardSubjectKey = `${req.subject}:*`.toLowerCase();
        const wildcardAllKey = '*:*';
        return (
          permSet.has(directKey) || permSet.has(wildcardSubjectKey) || permSet.has(wildcardAllKey)
        );
      });
    }

    return false;
  }
}
