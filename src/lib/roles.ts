import { ROLE_NAMES } from '@/types';
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

/** Case/whitespace-insensitive membership check — a role can be renamed without breaking comparisons. */
export function rolesInclude(roles: string[], roleName: string): boolean {
  const target = norm(roleName);
  return roles.some((r) => norm(r) === target);
}

const NORMALISED_HIERARCHY = ROLE_NAMES.map(norm);

/** Index within the built-in Super Admin → Building Operator ladder, or -1 for a custom role. */
export function roleLevel(roleName: string): number {
  return NORMALISED_HIERARCHY.indexOf(norm(roleName));
}

/** The most senior (lowest-index) level among a set of role names, or -1 if none are in the ladder. */
export function seniorMostLevel(roleNames: string[]): number {
  let best = -1;
  for (const name of roleNames) {
    const lvl = roleLevel(name);
    if (lvl >= 0 && (best === -1 || lvl < best)) best = lvl;
  }
  return best;
}

/**
 * The role name that should appear as "Reports To" options for someone
 * holding `roleNames` — i.e. the level immediately above their most senior
 * role. Returns null when there's no level above (Super Admin, or a role
 * outside the known hierarchy).
 */
export function expectedManagerRole(roleNames: string[]): string | null {
  const lvl = seniorMostLevel(roleNames);
  if (lvl <= 0) return null;
  return ROLE_NAMES[lvl - 1];
}
