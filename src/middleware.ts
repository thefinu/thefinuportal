import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Routes exclusively served on admin.thefinu.com
const ADMIN_PATHS = ['/dashboard', '/users', '/accounts', '/settings', '/subscriptions'];

// Routes exclusively served on thefinu.com (public)
const PUBLIC_ONLY_PATHS = ['/', '/about', '/contact', '/privacy', '/terms', '/cancel', '/success'];

// /login is shared — both domains can access it
const SHARED_PATHS = ['/login'];

function matchesPath(pathname: string, paths: string[]): boolean {
    return paths.some((p) => pathname === p || pathname.startsWith(p + '/'));
}

export function middleware(request: NextRequest) {
    const host = request.headers.get('host') || '';
    const { pathname } = request.nextUrl;

    // Allow all on localhost — no domain restrictions during development
    if (host.includes('localhost') || host.includes('127.0.0.1')) {
        return NextResponse.next();
    }

    const isAdminDomain = host.startsWith('admin.');
    const isAdminPath = matchesPath(pathname, ADMIN_PATHS);
    const isPublicOnlyPath = matchesPath(pathname, PUBLIC_ONLY_PATHS);

    if (isAdminDomain && isPublicOnlyPath) {
        // Redirect public-only paths to the main domain
        const url = request.nextUrl.clone();
        url.host = host.replace(/^admin\./, '');
        return NextResponse.redirect(url);
    }

    if (!isAdminDomain && isAdminPath) {
        // Redirect admin paths to admin subdomain
        const url = request.nextUrl.clone();
        url.host = 'admin.' + host;
        return NextResponse.redirect(url);
    }

    return NextResponse.next();
}

export const config = {
    // Skip Next.js internals, static files, and images
    matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp)$).*)'],
};
