import type { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { JwtAuthGuard } from './auth.guard';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new JwtAuthGuard(reflector);
  });

  it('should allow access if route has @Public() metadata', () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);

    const context = {
      getHandler: () => ({}),
      getClass: () => ({}),
    } as unknown as ExecutionContext;

    expect(guard.canActivate(context)).toBe(true);
  });

  it('should delegate to passport AuthGuard.canActivate if route is not public', () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
    const superSpy = vi
      .spyOn(AuthGuard('jwt').prototype, 'canActivate')
      .mockReturnValue(true as unknown as boolean);

    const context = {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({
        getRequest: () => ({ headers: {} }),
        getResponse: () => ({}),
      }),
    } as unknown as ExecutionContext;

    const result = guard.canActivate(context);
    expect(result).toBe(true);
    expect(superSpy).toHaveBeenCalled();
  });
});
