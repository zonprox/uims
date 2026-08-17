export enum PermissionAction {
  CREATE = 'create',
  READ = 'read',
  UPDATE = 'update',
  DELETE = 'delete',
  EXPORT = 'export',
  MANAGE = 'manage',
}

export enum PermissionSubject {
  ASSET = 'Asset',
  LICENSE = 'License',
  USER = 'User',
  GROUP = 'Group',
  ROLE = 'Role',
  ORGANIZATION = 'Organization',
  NETWORK = 'Network',
  INVENTORY = 'Inventory',
  AUDIT = 'Audit',
  REPORT = 'Report',
  SETTING = 'Setting',
  ALL = 'all',
}

export const SYSTEM_ROLE_NAMES = [
  'Super Admin',
  'Admin',
  'Technician',
  'Auditor',
  'Manager',
  'Employee',
] as const;

export type SystemRoleName = (typeof SYSTEM_ROLE_NAMES)[number];
