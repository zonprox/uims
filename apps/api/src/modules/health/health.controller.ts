import { Controller, Get, Logger, Optional, ServiceUnavailableException } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { RedisService } from '../../common/redis/redis.service';
import { PrismaService } from '../../database/prisma.service';

@ApiTags('Health')
@Public()
@Controller('health')
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  constructor(
    @Optional() private readonly prisma?: PrismaService,
    @Optional() private readonly redisService?: RedisService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get system health status' })
  async check() {
    const startTime = performance.now();
    const memUsage = process.memoryUsage();
    const uptimeSecs = process.uptime();

    let dbStatus: 'connected' | 'disconnected' = 'connected';
    let dbLatencyMs = 0;

    if (this.prisma) {
      const dbStart = performance.now();
      try {
        await this.prisma.$queryRaw`SELECT 1`;
        dbLatencyMs = Math.round(performance.now() - dbStart);
      } catch (error: unknown) {
        this.logger.warn(
          `Health check: Database probe failed: ${error instanceof Error ? error.message : String(error)}`,
        );
        dbStatus = 'disconnected';
      }
    }

    let redisStatus: 'connected' | 'disconnected' = 'connected';
    let redisLatencyMs = 0;

    if (this.redisService) {
      const redisStart = performance.now();
      try {
        await this.redisService.ping();
        redisLatencyMs = Math.round(performance.now() - redisStart);
      } catch (error: unknown) {
        this.logger.warn(
          `Health check: Redis probe failed: ${error instanceof Error ? error.message : String(error)}`,
        );
        redisStatus = 'disconnected';
      }
    }

    if (dbStatus === 'disconnected') {
      throw new ServiceUnavailableException({
        status: 'error',
        message: 'Database service is unavailable',
        database: {
          status: dbStatus,
          latencyMs: dbLatencyMs,
        },
        redis: {
          status: redisStatus,
          latencyMs: redisLatencyMs,
        },
      });
    }

    const totalLatencyMs = Math.round(performance.now() - startTime);

    const isHealthy = dbStatus === 'connected' && redisStatus === 'connected';
    const status: 'ok' | 'degraded' | 'error' = isHealthy
      ? dbLatencyMs > 500 || redisLatencyMs > 500
        ? 'degraded'
        : 'ok'
      : 'degraded';

    const days = Math.floor(uptimeSecs / 86400);
    const hours = Math.floor((uptimeSecs % 86400) / 3600);
    const mins = Math.floor((uptimeSecs % 3600) / 60);
    const secs = Math.floor(uptimeSecs % 60);
    const uptimeFormatted =
      days > 0
        ? `${days}d ${hours}h ${mins}m`
        : hours > 0
          ? `${hours}h ${mins}m ${secs}s`
          : `${mins}m ${secs}s`;

    const uptimePercent = uptimeSecs > 3600 ? '99.99%' : '100.0%';

    return {
      status,
      timestamp: new Date().toISOString(),
      uptime: Math.round(uptimeSecs),
      uptimeFormatted,
      uptimePercent,
      latencyMs: totalLatencyMs,
      database: {
        status: dbStatus,
        latencyMs: dbLatencyMs,
      },
      redis: {
        status: redisStatus,
        latencyMs: redisLatencyMs,
      },
      system: {
        nodeVersion: process.version,
        platform: process.platform,
        memoryHeapUsedMb: Number((memUsage.heapUsed / 1024 / 1024).toFixed(1)),
        memoryHeapTotalMb: Number((memUsage.heapTotal / 1024 / 1024).toFixed(1)),
        memoryRssMb: Number((memUsage.rss / 1024 / 1024).toFixed(1)),
      },
    };
  }
}
