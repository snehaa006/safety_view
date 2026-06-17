import type { AuthUser } from '@/types';

/** Roles that have full administrative access in the UI. */
export function isAdminRole(role: string | null | undefined): boolean {
  const r = (role || '').toUpperCase();
  return r === 'ADMIN' || r === 'SUPER_ADMIN';
}

export function isAdminUser(user: AuthUser | null | undefined): boolean {
  return isAdminRole(user?.role);
}
