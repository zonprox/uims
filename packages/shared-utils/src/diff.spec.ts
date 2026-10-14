import { describe, expect, it } from 'vitest';
import { REDACTED_VALUE, computeFieldDiff, isSensitiveFieldKey } from './diff';

describe('computeFieldDiff', () => {
  it('returns hasChanges=false when states are identical', () => {
    const state = {
      name: 'MacBook Pro',
      assetTag: 'AST-001',
      status: 'InUse',
      count: 5,
    };

    const result = computeFieldDiff(state, { ...state });

    expect(result.hasChanges).toBe(false);
    expect(result.oldValue).toBeNull();
    expect(result.newValue).toBeNull();
    expect(result.changedKeys).toEqual([]);
  });

  it('detects primitive value modifications and sorts changedKeys', () => {
    const oldState = {
      name: 'MacBook Pro 14',
      status: 'InStorage',
      cost: 1500,
      active: false,
    };
    const newState = {
      name: 'MacBook Pro 16',
      status: 'InUse',
      cost: 2000,
      active: true,
    };

    const result = computeFieldDiff(oldState, newState);

    expect(result.hasChanges).toBe(true);
    expect(result.changedKeys).toEqual(['active', 'cost', 'name', 'status']);
    expect(result.oldValue).toEqual({
      active: false,
      cost: 1500,
      name: 'MacBook Pro 14',
      status: 'InStorage',
    });
    expect(result.newValue).toEqual({
      active: true,
      cost: 2000,
      name: 'MacBook Pro 16',
      status: 'InUse',
    });
  });

  it('ignores default transient keys (createdAt, updatedAt)', () => {
    const oldState = {
      status: 'Available',
      createdAt: new Date('2026-01-01T00:00:00Z'),
      updatedAt: new Date('2026-01-01T00:00:00Z'),
    };
    const newState = {
      status: 'Available',
      createdAt: new Date('2026-01-01T00:00:00Z'),
      updatedAt: new Date('2026-02-01T12:00:00Z'),
    };

    const result = computeFieldDiff(oldState, newState);

    expect(result.hasChanges).toBe(false);
    expect(result.changedKeys).toEqual([]);
  });

  it('supports custom excludeKeys and ignoredKeys options', () => {
    const oldState = {
      title: 'Old Title',
      temporaryFlag: true,
      internalCache: 123,
    };
    const newState = {
      title: 'New Title',
      temporaryFlag: false,
      internalCache: 456,
    };

    const result = computeFieldDiff(oldState, newState, {
      excludeKeys: ['temporaryFlag'],
      ignoredKeys: ['internalCache'],
    });

    expect(result.hasChanges).toBe(true);
    expect(result.changedKeys).toEqual(['title']);
    expect(result.oldValue).toEqual({ title: 'Old Title' });
    expect(result.newValue).toEqual({ title: 'New Title' });
  });

  it('handles null, undefined, and partial objects gracefully', () => {
    const creationResult = computeFieldDiff(null, { name: 'Dell Server', rackUnit: 4 });

    expect(creationResult.hasChanges).toBe(true);
    expect(creationResult.changedKeys).toEqual(['name', 'rackUnit']);
    expect(creationResult.oldValue).toEqual({ name: null, rackUnit: null });
    expect(creationResult.newValue).toEqual({ name: 'Dell Server', rackUnit: 4 });

    const deletionResult = computeFieldDiff({ name: 'Dell Server', rackUnit: 4 }, undefined);

    expect(deletionResult.hasChanges).toBe(true);
    expect(deletionResult.changedKeys).toEqual(['name', 'rackUnit']);
    expect(deletionResult.oldValue).toEqual({ name: 'Dell Server', rackUnit: 4 });
    expect(deletionResult.newValue).toEqual({ name: null, rackUnit: null });
  });

  it('compares Date instances and ISO date strings without false diffs', () => {
    const d1 = new Date('2026-05-10T14:30:00.000Z');
    const d2 = new Date('2026-05-10T14:30:00.000Z');
    const isoString = '2026-05-10T14:30:00.000Z';

    const res1 = computeFieldDiff({ expiry: d1 }, { expiry: d2 });
    expect(res1.hasChanges).toBe(false);

    const res2 = computeFieldDiff({ expiry: d1 }, { expiry: isoString });
    expect(res2.hasChanges).toBe(false);

    const res3 = computeFieldDiff({ expiry: isoString }, { expiry: d2 });
    expect(res3.hasChanges).toBe(false);

    const d3 = new Date('2026-06-01T00:00:00.000Z');
    const resChanged = computeFieldDiff({ expiry: d1 }, { expiry: d3 });
    expect(resChanged.hasChanges).toBe(true);
    expect(resChanged.oldValue).toEqual({ expiry: '2026-05-10T14:30:00.000Z' });
    expect(resChanged.newValue).toEqual({ expiry: '2026-06-01T00:00:00.000Z' });
  });

  it('compares nested objects and arrays using JSON equality', () => {
    const oldState = {
      tags: ['it', 'hardware'],
      meta: { model: 'T14', gen: 3 },
    };
    const newState = {
      tags: ['it', 'hardware'],
      meta: { model: 'T14', gen: 3 },
    };

    expect(computeFieldDiff(oldState, newState).hasChanges).toBe(false);

    const modifiedState = {
      tags: ['it', 'hardware', 'laptop'],
      meta: { model: 'T14', gen: 4 },
    };
    const diff = computeFieldDiff(oldState, modifiedState);
    expect(diff.hasChanges).toBe(true);
    expect(diff.changedKeys).toEqual(['meta', 'tags']);
  });

  it('automatically redacts sensitive keys matching all security patterns', () => {
    const oldState = {
      username: 'jdoe',
      password: 'OldPassword123!',
      adInitialPassword: 'InitialAd#1',
      corporateEmailPassword: 'CorpEmail#1',
      token: 'jwt-token-v1',
      apiToken: 'tok-abc-123',
      secret: 'secret-key-1',
      licenseKey: 'MS-OFFICE-2026-KEY',
      licensekey: 'WIN-11-PRO-KEY',
      pin: '1234',
      salt: 'salt-v1',
      apiKey: 'ak-live-999',
      privateKey: 'rsa-private-1',
      credentials: 'creds-data',
    };

    const newState = {
      username: 'jdoe',
      password: 'NewPassword456!',
      adInitialPassword: 'InitialAd#2',
      corporateEmailPassword: 'CorpEmail#2',
      token: 'jwt-token-v2',
      apiToken: 'tok-xyz-789',
      secret: 'secret-key-2',
      licenseKey: 'MS-OFFICE-2026-KEY-UPDATED',
      licensekey: 'WIN-11-ENT-KEY',
      pin: '5678',
      salt: 'salt-v2',
      apiKey: 'ak-live-1000',
      privateKey: 'rsa-private-2',
      credentials: 'creds-data-updated',
    };

    const result = computeFieldDiff(oldState, newState);

    expect(result.hasChanges).toBe(true);
    expect(result.changedKeys).not.toContain('username'); // unchanged
    expect(result.changedKeys).toEqual([
      'adInitialPassword',
      'apiKey',
      'apiToken',
      'corporateEmailPassword',
      'credentials',
      'licenseKey',
      'licensekey',
      'password',
      'pin',
      'privateKey',
      'salt',
      'secret',
      'token',
    ]);

    for (const key of result.changedKeys) {
      expect(result.oldValue?.[key]).toBe(REDACTED_VALUE);
      expect(result.newValue?.[key]).toBe(REDACTED_VALUE);
    }
  });

  it('redacts sensitive keys when field changes from null or to null', () => {
    const oldState = { password: null };
    const newState = { password: 'SuperSecret123!' };

    const result = computeFieldDiff(oldState, newState);

    expect(result.hasChanges).toBe(true);
    expect(result.oldValue).toEqual({ password: null });
    expect(result.newValue).toEqual({ password: REDACTED_VALUE });
  });

  it('supports custom sensitiveKeys parameter', () => {
    const oldState = { customConfidentialInfo: 'alpha' };
    const newState = { customConfidentialInfo: 'beta' };

    const result = computeFieldDiff(oldState, newState, {
      sensitiveKeys: ['customConfidentialInfo'],
    });

    expect(result.hasChanges).toBe(true);
    expect(result.oldValue).toEqual({ customConfidentialInfo: REDACTED_VALUE });
    expect(result.newValue).toEqual({ customConfidentialInfo: REDACTED_VALUE });
  });

  it('isSensitiveFieldKey correctly classifies sensitive keys', () => {
    expect(isSensitiveFieldKey('password')).toBe(true);
    expect(isSensitiveFieldKey('user_password')).toBe(true);
    expect(isSensitiveFieldKey('licenseKey')).toBe(true);
    expect(isSensitiveFieldKey('license_key')).toBe(true);
    expect(isSensitiveFieldKey('apiToken')).toBe(true);
    expect(isSensitiveFieldKey('clientSecret')).toBe(true);
    expect(isSensitiveFieldKey('pin')).toBe(true);
    expect(isSensitiveFieldKey('salt')).toBe(true);
    expect(isSensitiveFieldKey('key')).toBe(true);
    expect(isSensitiveFieldKey('privateKey')).toBe(true);
    expect(isSensitiveFieldKey('credentials')).toBe(true);

    expect(isSensitiveFieldKey('status')).toBe(false);
    expect(isSensitiveFieldKey('name')).toBe(false);
    expect(isSensitiveFieldKey('assetTag')).toBe(false);
    expect(isSensitiveFieldKey('email')).toBe(false);
    expect(isSensitiveFieldKey('description')).toBe(false);
  });
});
