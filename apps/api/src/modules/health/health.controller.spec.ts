import { ServiceUnavailableException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { RedisService } from '../../common/redis/redis.service';
import type { PrismaService } from '../../database/prisma.service';
import { HealthController } from './health.controller';

describe('HealthController', () => {
  it('should return health status ok with real telemetry', async () => {
    const controller = new HealthController();
    const result = await controller.check();
    expect(result.status).toBe('ok');
    expect(result.timestamp).toBeDefined();
    expect(result.uptime).toBeDefined();
    expect(result.uptimeFormatted).toBeDefined();
    expect(result.uptimePercent).toBeDefined();
    expect(result.database.status).toBe('connected');
    expect(result.redis.status).toBe('connected');
    expect(result.system.nodeVersion).toBeDefined();
    expect(result.system.memoryHeapUsedMb).toBeGreaterThan(0);
  });

  it('should throw ServiceUnavailableException (503) when PostgreSQL is unreachable', async () => {
    const mockPrisma = {
      $queryRaw: vi.fn().mockRejectedValue(new Error('Connection refused')),
    } as unknown as PrismaService;

    const controller = new HealthController(mockPrisma);
    await expect(controller.check()).rejects.toThrow(ServiceUnavailableException);
  });

  it('should report Redis availability and latency when Redis ping succeeds', async () => {
    const mockPrisma = {
      $queryRaw: vi.fn().mockResolvedValue([{ '?column?': 1 }]),
    } as unknown as PrismaService;
    const mockRedis = {
      ping: vi.fn().mockResolvedValue('PONG'),
    } as unknown as RedisService;

    const controller = new HealthController(mockPrisma, mockRedis);
    const result = await controller.check();
    expect(result.status).toBe('ok');
    expect(result.database.status).toBe('connected');
    expect(result.redis.status).toBe('connected');
    expect(result.redis.latencyMs).toBeGreaterThanOrEqual(0);
    expect(mockRedis.ping).toHaveBeenCalled();
  });

  it('should report degraded status when Redis ping fails but PostgreSQL is healthy', async () => {
    const mockPrisma = {
      $queryRaw: vi.fn().mockResolvedValue([{ '?column?': 1 }]),
    } as unknown as PrismaService;
    const mockRedis = {
      ping: vi.fn().mockRejectedValue(new Error('Redis connection timeout')),
    } as unknown as RedisService;

    const controller = new HealthController(mockPrisma, mockRedis);
    const result = await controller.check();
    expect(result.status).toBe('degraded');
    expect(result.database.status).toBe('connected');
    expect(result.redis.status).toBe('disconnected');
  });
});
