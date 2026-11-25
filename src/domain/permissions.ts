import type { Role } from './types';

export function canViewDashboard(role: Role): boolean {
  return role === 'owner' || role === 'admin' || role === 'accountant';
}

export function canViewCustomers(role: Role): boolean {
  return role !== 'viewer';
}

export function canCreateInvoice(role: Role): boolean {
  return role === 'owner' || role === 'admin' || role === 'accountant' || role === 'member';
}

export function canSendInvoice(role: Role): boolean {
  return role === 'owner' || role === 'admin' || role === 'accountant';
}

export function canManageCustomers(role: Role): boolean {
  return canCreateInvoice(role);
}

export function roleLabel(role: Role): string {
  return role.charAt(0).toUpperCase() + role.slice(1);
}

const ROLE_RANK: Record<Role, number> = {
  owner: 0,
  admin: 1,
  accountant: 2,
  member: 3,
  viewer: 4,
};

export function compareRoles(a: Role, b: Role): number {
  return ROLE_RANK[a] - ROLE_RANK[b];
}
