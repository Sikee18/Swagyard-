import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';
import { NextResponse } from 'next/server';
import { db } from './db';
import { isAdmin } from './roles';

// Never fall back to a built-in secret: a known key would let anyone forge admin sessions.
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET must be set to at least 32 characters (see .env.example)');
}
const SECRET_KEY = new TextEncoder().encode(process.env.JWT_SECRET);

const SESSION_COOKIE_NAME = 'swagyard_session';
const SESSION_EXPIRY = '7d';

export interface SessionUser {
  id: string;
  username: string;
  name: string;
  role: string;
}

/**
 * Hash a plain-text password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

/**
 * Verify a plain-text password against a stored bcrypt hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Create a signed JWT session token
 */
export async function createSessionToken(user: SessionUser): Promise<string> {
  return new SignJWT({
    id: user.id,
    username: user.username,
    name: user.name,
    role: user.role,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(SESSION_EXPIRY)
    .sign(SECRET_KEY);
}

/**
 * Verify and decode an existing JWT session token
 */
export async function verifySessionToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET_KEY);
    return {
      id: payload.id as string,
      username: payload.username as string,
      name: payload.name as string,
      role: payload.role as string,
    };
  } catch (err) {
    return null;
  }
}

/**
 * Set httpOnly secure session cookie
 */
export async function setSessionCookie(user: SessionUser) {
  const token = await createSessionToken(user);
  cookies().set({
    name: SESSION_COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60, // 7 days
  });
}

/**
 * Remove session cookie (Logout)
 */
export async function clearSessionCookie() {
  cookies().delete(SESSION_COOKIE_NAME);
}

/**
 * Retrieve currently logged-in user from request cookies
 */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const cookie = cookies().get(SESSION_COOKIE_NAME);
  if (!cookie?.value) return null;
  return verifySessionToken(cookie.value);
}

/**
 * Server route guard for admin-only actions (deleting records, coupons, analytics, barcodes).
 * Throws 'Unauthorized' without a session and 'Forbidden' for staff.
 */
export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireAuth();
  if (!isAdmin(user.role)) throw new Error('Forbidden');
  return user;
}

/** Maps auth guard errors to responses; returns null for any other error. */
export function authErrorResponse(err: unknown) {
  const message = err instanceof Error ? err.message : '';
  if (message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (message === 'Forbidden') return NextResponse.json({ error: 'Admin access required for this action.' }, { status: 403 });
  return null;
}

/**
 * Server route guard requiring authenticated session
 */
export async function requireAuth(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('Unauthorized');
  }
  return user;
}
