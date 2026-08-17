import { SetMetadata } from '@nestjs/common';

export interface RequiredPermission {
  action: string;
  subject: string;
}

export const PERMISSIONS_KEY = 'required_permissions';

export const RequirePermissions = (...permissions: RequiredPermission[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
