'use client';

import { createContext, useContext } from 'react';
import type { Role } from '@/lib/roles';

export interface CurrentUser {
  id: string;
  username: string;
  name: string;
  role: Role;
}

/** The signed-in user; `null` while loading. Admin-only buttons stay hidden until it resolves. */
export const RoleContext = createContext<CurrentUser | null>(null);

export const useCurrentUser = () => useContext(RoleContext);

/** True only once the signed-in user is known to be an admin. */
export const useIsAdmin = () => useContext(RoleContext)?.role === 'admin';
