import type { AuthUser } from '@/types';

function norm(s: string): string {
  return s.toUpperCase().replace(/[\s_-]+/g, '_');
}

/** Super Admin has full administrative access in the UI. */
export function isAdminRoles(roles: string[] | null | undefined): boolean {
  return (roles ?? []).some((r) => norm(r) === 'SUPER_ADMIN');
}

export function isAdminUser(user: AuthUser | null | undefined): boolean {
  return isAdminRoles(user?.roles);
}

export function hasRole(user: AuthUser | null | undefined, roleName: string): boolean {
  return (user?.roles ?? []).some((r) => norm(r) === norm(roleName));
}
