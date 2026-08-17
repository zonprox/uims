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
    if (userRole === 'SUPER ADMIN' || userRole === 'SUPERADMIN') {
      return true;
    }

    // Admin inherits Manager, Technician, Auditor, and Employee roles
    if (userRole === 'ADMIN') {
      return roles.some((r) => {
        const target = r.trim().toUpperCase();
        return ['ADMIN', 'MANAGER', 'TECHNICIAN', 'AUDITOR', 'EMPLOYEE'].includes(target);
      });
    }

    return false;
  }
}
