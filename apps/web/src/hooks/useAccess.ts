import { useAuthStore } from '../stores/auth.store';

export function useAccess() {
  const user = useAuthStore((state) => state.user);
  const permissions = useAuthStore((state) => state.permissions);
  const isSuperAdmin = useAuthStore((state) => state.isSuperAdmin);
  const hasRole = useAuthStore((state) => state.hasRole);
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const can = useAuthStore((state) => state.can);

  return {
    user,
    permissions,
    isSuperAdmin: isSuperAdmin(),
    hasRole: (role: string | string[]) => hasRole(role),
    hasPermission: (perm: string) => hasPermission(perm),
    can: (action: string, subject: string) => can(action, subject),
  };
}
