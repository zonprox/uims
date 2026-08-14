export const API_URL = import.meta.env.VITE_API_URL || '/api';
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
