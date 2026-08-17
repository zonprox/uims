import { type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PermissionsGuard } from './permissions.guard';

describe('PermissionsGuard', () => {
  let guard: PermissionsGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new PermissionsGuard(reflector);
  });

  const createMockContext = (user: unknown): ExecutionContext => {
    return {
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as unknown as ExecutionContext;
  };

  it('should allow access if no permissions are required', async () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    const context = createMockContext(null);
    expect(await guard.canActivate(context)).toBe(true);
  });

  it('should reject if user is not authenticated', async () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue([
      { action: 'create', subject: 'Asset' },
    ]);
    const context = createMockContext(null);
    expect(await guard.canActivate(context)).toBe(false);
  });

  it('should allow Super Admin unconditionally', async () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue([
      { action: 'delete', subject: 'Setting' },
    ]);
    const context = createMockContext({ role: 'Super Admin' });
    expect(await guard.canActivate(context)).toBe(true);
  });

  it('should allow user with matching permissions in payload', async () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue([
      { action: 'create', subject: 'Asset' },
    ]);
    const context = createMockContext({
      role: 'Technician',
      permissions: ['Asset:create', 'Asset:read'],
    });
    expect(await guard.canActivate(context)).toBe(true);
  });

  it('should reject user without required permission in payload', async () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue([
      { action: 'delete', subject: 'Asset' },
    ]);
    const context = createMockContext({
      role: 'Technician',
      permissions: ['Asset:create', 'Asset:read'],
    });
    expect(await guard.canActivate(context)).toBe(false);
  });
});
