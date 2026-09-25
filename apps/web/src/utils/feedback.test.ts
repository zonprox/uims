import axios, { type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import { describe, expect, it } from 'vitest';
import { formatErrorMessage, getPermissionDeniedMessage } from './feedback';

describe('formatErrorMessage', () => {
  it('formats HTTP 403 Forbidden with action message', () => {
    const error = new axios.AxiosError(
      'Request failed with status code 403',
      '403',
      {} as InternalAxiosRequestConfig,
      {},
      {
        status: 403,
        data: { message: 'Forbidden resource' },
      } as AxiosResponse,
    );

    const result = formatErrorMessage(error, 'delete this asset');
    expect(result).toBe('Access denied: Insufficient permissions to delete this asset.');
  });

  it('formats HTTP 403 Forbidden with generic action', () => {
    const error = new axios.AxiosError(
      'Request failed with status code 403',
      '403',
      {} as InternalAxiosRequestConfig,
      {},
      {
        status: 403,
        data: { message: 'Forbidden resource' },
      } as AxiosResponse,
    );

    const result = formatErrorMessage(error);
    expect(result).toBe('Access denied: Insufficient permissions.');
  });

  it('formats HTTP 403 with specific custom server message', () => {
    const error = new axios.AxiosError(
      'Request failed with status code 403',
      '403',
      {} as InternalAxiosRequestConfig,
      {},
      {
        status: 403,
        data: { message: 'Only Admins can export audit logs' },
      } as AxiosResponse,
    );

    const result = formatErrorMessage(error);
    expect(result).toBe('Access denied: Only Admins can export audit logs');
  });

  it('formats HTTP 401 Unauthorized', () => {
    const error = new axios.AxiosError(
      'Request failed with status code 401',
      '401',
      {} as InternalAxiosRequestConfig,
      {},
      {
        status: 401,
        data: { message: 'Unauthorized' },
      } as AxiosResponse,
    );

    const result = formatErrorMessage(error);
    expect(result).toBe('Session expired or unauthenticated. Please sign in again.');
  });

  it('formats validation errors array from backend', () => {
    const error = new axios.AxiosError('Bad Request', '400', {} as InternalAxiosRequestConfig, {}, {
      status: 400,
      data: { message: ['sku must be unique', 'cost must be positive'] },
    } as AxiosResponse);

    const result = formatErrorMessage(error);
    expect(result).toBe('sku must be unique, cost must be positive');
  });

  it('handles standard Error with 403 or permission in message', () => {
    const error = new Error('Permission denied by RBAC policy');
    const result = formatErrorMessage(error, 'modify network settings');
    expect(result).toBe('Access denied: Insufficient permissions to modify network settings.');
  });

  it('handles unknown error types with fallback', () => {
    const result = formatErrorMessage(null, 'save settings');
    expect(result).toBe('Failed to save settings. Please try again.');
  });

  it('extracts server message from raw JSON string response (e.g. text/csv responseType error)', () => {
    const error = new axios.AxiosError(
      'Request failed with status code 500',
      '500',
      {} as InternalAxiosRequestConfig,
      {},
      {
        status: 500,
        data: JSON.stringify({
          statusCode: 500,
          message: 'Database connection failed during export',
        }),
      } as AxiosResponse,
    );

    const result = formatErrorMessage(error, 'export activity logs');
    expect(result).toBe('Database connection failed during export');
  });

  it('uses defaultFallback when provided for non-permission errors', () => {
    const error = new Error('Database connection failed');
    const result = formatErrorMessage(
      error,
      'load settings',
      'Failed to load system settings from server.',
    );
    expect(result).toBe('Failed to load system settings from server.');
  });
});

describe('getPermissionDeniedMessage', () => {
  it('returns standard access denied string for an action', () => {
    expect(getPermissionDeniedMessage('delete user account')).toBe(
      'Access denied: Insufficient permissions to delete user account.',
    );
    expect(getPermissionDeniedMessage()).toBe('Access denied: Insufficient permissions.');
  });
});
