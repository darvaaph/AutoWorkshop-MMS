import { useAuthStore } from '@/store/authStore';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';

export function useAuth() {
  const { user, isAuthenticated, isAdmin, clearAuth } = useAuthStore();

  const checkPermission = (permission: keyof typeof PERMISSIONS) => {
    return hasPermission(user?.role, permission);
  };

  return {
    user,
    isAuthenticated,
    isAdmin: isAdmin(),
    checkPermission,
    logout: clearAuth,
  };
}