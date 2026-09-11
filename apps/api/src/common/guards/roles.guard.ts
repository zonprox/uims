import { type CanActivate, type ExecutionContext, Injectable, Optional } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(@Optional() private reflector?: Reflector) {
    if (!this.reflector) {
      this.reflector = new Reflector();
    }
  }

  canActivate(context: ExecutionContext): boolean {
    const reflector = this.reflector || new Reflector();
    const roles = reflector.getAllAndOverride<Array<string>>('roles', [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!roles || roles.length === 0) {
      return true;
    }
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (!user?.role) {
      return false;
    }
    const userRole = String(user.role).trim().toUpperCase();

    // Direct match check
    if (roles.some((r) => r.trim().toUpperCase() === userRole)) {
      return true;
    }

    // Super Admin inherits all role permissions
    if (userRole === 'SUPER ADMIN' || userRole === 'SUPERADMIN' || userRole === 'SUPER_ADMIN') {
      return true;
    }

    // Admin inherits Manager, User, Viewer, Technician, Auditor, and Employee roles
    if (userRole === 'ADMIN') {
      return roles.some((r) => {
        const target = r.trim().toUpperCase();
        return ['ADMIN', 'MANAGER', 'USER', 'VIEWER', 'TECHNICIAN', 'AUDITOR', 'EMPLOYEE'].includes(
          target,
        );
      });
    }

    // Manager inherits User, Viewer, and Employee roles
    if (userRole === 'MANAGER') {
      return roles.some((r) => {
        const target = r.trim().toUpperCase();
        return ['MANAGER', 'USER', 'VIEWER', 'EMPLOYEE'].includes(target);
      });
    }

    // User inherits Viewer and Employee roles
    if (userRole === 'USER') {
      return roles.some((r) => {
        const target = r.trim().toUpperCase();
        return ['USER', 'VIEWER', 'EMPLOYEE'].includes(target);
      });
    }

    // Viewer matches Viewer and Auditor
    if (userRole === 'VIEWER') {
      return roles.some((r) => {
        const target = r.trim().toUpperCase();
        return ['VIEWER', 'AUDITOR'].includes(target);
      });
    }

    return false;
  }
}
