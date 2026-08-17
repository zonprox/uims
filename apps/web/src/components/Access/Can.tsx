import React, { type ReactNode } from 'react';
import { useAccess } from '../../hooks/useAccess';

export interface CanProps {
  action?: string;
  subject?: string;
  role?: string | string[];
  permission?: string;
  fallback?: ReactNode;
  children: ReactNode | ((hasAccess: boolean) => ReactNode);
}

export function Can({ action, subject, role, permission, fallback = null, children }: CanProps) {
  const access = useAccess();

  let hasAccess = true;

  if (role) {
    hasAccess = hasAccess && access.hasRole(role);
  }

  if (permission) {
    hasAccess = hasAccess && access.hasPermission(permission);
  }

  if (action && subject) {
    hasAccess = hasAccess && access.can(action, subject);
  }

  if (!hasAccess) {
    return <>{fallback}</>;
  }

  if (typeof children === 'function') {
    return <>{children(hasAccess)}</>;
  }

  return <>{children}</>;
}
