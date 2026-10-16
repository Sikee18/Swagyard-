import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

// Never fall back to a built-in secret: a known key would let anyone forge admin sessions.
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET must be set to at least 32 characters (see .env.example)');
}
const SECRET_KEY = new TextEncoder().encode(process.env.JWT_SECRET);

const PUBLIC_PATHS = [
  '/admin-login',
  '/api/auth/login',
  '/_next',
  '/favicon.ico',
  '/manifest.webmanifest',
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    PUBLIC_PATHS.some((path) => pathname.startsWith(path)) ||
    pathname.startsWith('/invoice/') || // Public digital invoices
    pathname.startsWith('/api/invoices/') // Public invoice data API
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get('swagyard_session')?.value;

  if (!token) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const loginUrl = new URL('/admin-login', request.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  try {
    await jwtVerify(token, SECRET_KEY);
    return NextResponse.next();
  } catch (err) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Invalid or expired session' }, { status: 401 });
    }
    const loginUrl = new URL('/admin-login', request.url);
    return NextResponse.redirect(loginUrl);
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
