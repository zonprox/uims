import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authService } from '../services/auth.service';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
  permissions?: string[];
}

export interface AuthState {
  user: AuthUser | null;
  token: string | null;
  permissions: string[];
  login: (token: string, user: AuthUser, permissions?: string[]) => void;
  logout: () => void;
  isAuthenticated: () => boolean;
  isSuperAdmin: () => boolean;
  hasRole: (roleName: string | string[]) => boolean;
  hasPermission: (permissionStr: string) => boolean;
  can: (action: string, subject: string) => boolean;
  setPermissions: (permissions: string[]) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      permissions: [],

      login: (token: string, user: AuthUser, perms?: string[]) => {
        const userPerms = perms || user.permissions || [];
        set({
          token,
          user: { ...user, permissions: userPerms },
          permissions: userPerms,
        });
      },

      logout: () => {
        authService.logout();
        set({ token: null, user: null, permissions: [] });
      },

      isAuthenticated: () => !!get().token,

      isSuperAdmin: () => {
        const user = get().user;
        if (!user?.role) return false;
        const r = user.role.trim().toUpperCase();
        return r === 'SUPER ADMIN' || r === 'SUPERADMIN' || r === 'SUPER_ADMIN';
      },

      hasRole: (roleName: string | string[]) => {
        const user = get().user;
        if (!user?.role) return false;
        const currentRole = user.role.trim().toUpperCase();
        if (get().isSuperAdmin()) return true;

        if (Array.isArray(roleName)) {
          return roleName.some((r) => r.trim().toUpperCase() === currentRole);
        }
        return roleName.trim().toUpperCase() === currentRole;
      },

      hasPermission: (permissionStr: string) => {
        if (get().isSuperAdmin()) return true;
        const perms = get().permissions;
        const target = permissionStr.trim().toLowerCase();
        return perms.some((p) => {
          const lp = p.trim().toLowerCase();
          return lp === target || lp === '*:*' || (target.includes(':') && lp === `${target.split(':')[0]}:*`);
        });
      },

      can: (action: string, subject: string) => {
        if (get().isSuperAdmin()) return true;
        const target = `${subject}:${action}`.trim().toLowerCase();
        return get().hasPermission(target);
      },

      setPermissions: (permissions: string[]) => {
        const user = get().user;
        set({
          permissions,
          user: user ? { ...user, permissions } : null,
        });
      },
    }),
    {
      name: 'uims-auth-storage',
    },
  ),
);
