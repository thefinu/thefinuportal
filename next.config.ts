import type { NextConfig } from "next";

/**
 * Security headers.
 *
 * There were none, so the admin panel could be framed by any site, responses were
 * sniffable, and nothing constrained what a page could load or execute — which is what
 * would have contained the CMS content the legal pages render as HTML.
 *
 * The policy deliberately allows 'unsafe-inline' for styles and 'unsafe-inline' plus
 * 'unsafe-eval' for scripts: Next.js injects inline bootstrap scripts and Tailwind
 * injects styles, so anything stricter needs per-request nonces. It still pins WHERE
 * scripts, frames and connections may come from, which is the part that stops injected
 * content from reaching an attacker's server.
 */
/**
 * Where the browser is allowed to send API calls.
 *
 * Taken from the app's own configuration rather than hardcoded: if NEXT_PUBLIC_API_URL
 * ever points somewhere else — a Cloud Run URL, a staging API — a fixed list would
 * block every request the site makes and the pages would look broken with nothing in
 * the server logs to explain it. Localhost is included so `next dev` against a local
 * backend still works.
 */
function apiOrigins(): string[] {
  const origins = new Set<string>(["https://api.stripe.com"]);

  const configured = process.env.NEXT_PUBLIC_API_URL;
  if (configured) {
    try {
      origins.add(new URL(configured).origin);
    } catch {
      // Not a URL we can parse; the defaults below still apply.
    }
  } else {
    origins.add("https://gcapi.thefinu.com");
  }

  if (process.env.NODE_ENV !== "production") {
    origins.add("http://localhost:5000");
    origins.add("http://127.0.0.1:5000");
  }

  return [...origins];
}

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com data:",
      "img-src 'self' data: https:",
      `connect-src 'self' ${apiOrigins().join(" ")}`,
      "frame-src https://js.stripe.com https://hooks.stripe.com",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  output: "standalone",
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
