import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Routes exclusively served on admin.thefinu.com
const ADMIN_PATHS = ['/dashboard', '/users', '/accounts', '/settings', '/subscriptions', '/cms', '/plans'];

// Routes exclusively served on thefinu.com (public)
const PUBLIC_ONLY_PATHS = ['/', '/about', '/contact', '/privacy', '/terms', '/cancel', '/success', '/help'];

function matchesPath(pathname: string, paths: string[]): boolean {
    return paths.some((p) => pathname === p || pathname.startsWith(p + '/'));
}

/** Development hosts. An exact match, not a substring: `evil-localhost.com` contains
 *  "localhost" and used to skip every check below. */
function isDevHost(host: string): boolean {
    const name = host.split(':')[0];
    return name === 'localhost' || name === '127.0.0.1' || name === '[::1]';
}

/**
 * Whether an admin token is genuine and still valid.
 *
 * The middleware used to accept any non-empty cookie value, so `document.cookie =
 * 'admin_token=x'` rendered the whole admin shell. The data behind it was never at
 * risk — every admin endpoint checks the token server-side — but a security boundary
 * that only looks like one is worse than none, because it invites trust.
 *
 * The signature is checked with Web Crypto (the backend signs HS256) when
 * ADMIN_JWT_SECRET is configured; it must hold the same value as the backend's
 * JWT_SECRET. Without it, the expiry and shape are still enforced, which is weaker but
 * strictly better than a presence check — and the API remains the real boundary.
 */
async function isValidAdminToken(token: string | undefined): Promise<boolean> {
    if (!token) return false;

    const parts = token.split('.');
    if (parts.length !== 3) return false;

    try {
        const payloadJson = atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'));
        const payload = JSON.parse(payloadJson);

        // An expired token is refused whether or not the secret is available.
        if (typeof payload.exp !== 'number' || payload.exp * 1000 <= Date.now()) return false;

        const secret = process.env.ADMIN_JWT_SECRET;
        if (!secret) return true;

        const key = await crypto.subtle.importKey(
            'raw',
            new TextEncoder().encode(secret),
            { name: 'HMAC', hash: 'SHA-256' },
            false,
            ['verify']
        );

        const signature = Uint8Array.from(
            atob(parts[2].replace(/-/g, '+').replace(/_/g, '/')),
            (c) => c.charCodeAt(0)
        );

        return await crypto.subtle.verify(
            'HMAC',
            key,
            signature,
            new TextEncoder().encode(`${parts[0]}.${parts[1]}`)
        );
    } catch {
        return false;
    }
}

export async function middleware(request: NextRequest) {
    const host = request.headers.get('host') || '';
    const { pathname } = request.nextUrl;

    const isAdminPath = matchesPath(pathname, ADMIN_PATHS);
    const adminToken = request.cookies.get('admin_token')?.value;

    // Admin routes require a valid token on EVERY host, including development and the
    // Cloud Run URL. Tying the check to the admin domain meant those hosts served the
    // admin shell to anyone, and redirected to a subdomain that does not exist there.
    if (isAdminPath && !(await isValidAdminToken(adminToken))) {
        const url = request.nextUrl.clone();
        url.pathname = '/login';
        return NextResponse.redirect(url);
    }

    // Domain routing below is presentation only; it is not a security boundary.
    if (isDevHost(host)) {
        return NextResponse.next();
    }

    const isAdminDomain = host.startsWith('admin.');
    const isPublicOnlyPath = matchesPath(pathname, PUBLIC_ONLY_PATHS);

    if (isAdminDomain && pathname === '/') {
        // admin.thefinu.com/ → dashboard if authenticated, login if not
        const url = request.nextUrl.clone();
        url.pathname = (await isValidAdminToken(adminToken)) ? '/dashboard' : '/login';
        return NextResponse.redirect(url);
    }

    if (isAdminDomain && isPublicOnlyPath) {
        // Redirect other public-only paths to the main domain
        const url = request.nextUrl.clone();
        url.host = host.replace(/^admin\./, '');
        return NextResponse.redirect(url);
    }

    if (!isAdminDomain && isAdminPath) {
        // Admin pages live on the admin subdomain. The token was already checked above,
        // so this is only about which host serves the page.
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
