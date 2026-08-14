import { useAuthStore } from '../stores/auth.store';

export function useAuth() {
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => !!state.token);
  const logout = useAuthStore((state) => state.logout);

  return { user, isAuthenticated, logout };
}
