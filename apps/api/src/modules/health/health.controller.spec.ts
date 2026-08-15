import { describe, expect, it } from 'vitest';
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
    expect(result.system.nodeVersion).toBeDefined();
    expect(result.system.memoryHeapUsedMb).toBeGreaterThan(0);
  });
});
