import { describe, expect, it } from 'vitest';
import { RedisService } from './redis.service';

describe('RedisService', () => {
  it('should operate in resilient in-memory mode when Redis is disconnected', async () => {
    const service = new RedisService();
    // Do not call connect, so it uses memory fallback

    await service.set('test-key', { foo: 'bar' }, 60);
    const result = await service.get<{ foo: string }>('test-key');

    expect(result).toEqual({ foo: 'bar' });
    expect(await service.isHealthy()).toBe(true);

    await service.del('test-key');
    const afterDel = await service.get('test-key');
    expect(afterDel).toBeNull();
  });

  it('should handle pattern deletion in fallback cache', async () => {
    const service = new RedisService();

    await service.set('uims:cache:dashboard:overview:all', { kpi: 100 });
    await service.set('uims:cache:dashboard:overview:month', { kpi: 50 });
    await service.set('uims:cache:settings:all', { theme: 'dark' });

    await service.delPattern('uims:cache:dashboard:*');

    expect(await service.get('uims:cache:dashboard:overview:all')).toBeNull();
    expect(await service.get('uims:cache:dashboard:overview:month')).toBeNull();
    expect(await service.get('uims:cache:settings:all')).toEqual({ theme: 'dark' });
  });

  it('should increment counters correctly with TTL', async () => {
    const service = new RedisService();

    const count1 = await service.incr('test-counter', 60);
    const count2 = await service.incr('test-counter', 60);

    expect(count1).toBe(1);
    expect(count2).toBe(2);
  });
});
