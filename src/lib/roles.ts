/**
 * Role model, matching the reference POS: admins get every module; staff (and the legacy
 * "cashier" role) get the day-to-day modules only and cannot delete records, manage coupons,
 * view analytics, or generate barcodes.
 */

export type Role = 'admin' | 'staff';

/** Dashboard tabs a staff member may open. */
export const STAFF_TABS = ['pos', 'inventory', 'advance_orders', 'birthdays', 'expenses', 'order_history'] as const;

export const isAdmin = (role: string | null | undefined) => role === 'admin';

/** Any non-admin role is treated as staff. */
export const normalizeRole = (role: string | null | undefined): Role => (isAdmin(role) ? 'admin' : 'staff');

export const canOpenTab = (role: string | null | undefined, tab: string) =>
  isAdmin(role) || (STAFF_TABS as readonly string[]).includes(tab);
