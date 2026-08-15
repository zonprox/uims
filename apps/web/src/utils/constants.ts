export const API_URL = '/api/v1';
export const APP_NAME = 'UIMS';

export const PAGINATION_DEFAULT = {
  current: 1,
  pageSize: 10,
};

export const STATUS_COLORS: Record<string, string> = {
  Active: 'success',
  Inactive: 'default',
  Pending: 'warning',
  Error: 'error',
  'In Repair': 'warning',
  Allocated: 'blue',
};
