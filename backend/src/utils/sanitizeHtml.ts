/**
 * Strips anything executable from CMS HTML before it is stored.
 *
 * The privacy and terms pages render this content with dangerouslySetInnerHTML, so
 * whatever is saved here runs in every visitor's browser on thefinu.com. Authoring is
 * admin-only, which makes this stored XSS behind an admin account rather than an open
 * door — but the admin token lives in the browser, so that account is exactly the one
 * an attacker would already be after.
 *
 * Deliberately an allowlist, and deliberately dependency-free: an allowlist fails
 * closed on markup nobody anticipated, while a blocklist has to predict every trick.
 * Anything not on the list has its tags removed and its text kept, so a legal document
 * never loses its words — only its markup.
 */

// Formatting and document structure only. Nothing that loads, frames or executes.
const ALLOWED_TAGS = new Set([
    'p', 'br', 'hr', 'div', 'span',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'ul', 'ol', 'li', 'dl', 'dt', 'dd',
    'strong', 'b', 'em', 'i', 'u', 's', 'sub', 'sup', 'small',
    'blockquote', 'pre', 'code',
    'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'caption',
    'a',
]);

// href is allowed on links only, and only when it points somewhere inert.
const ALLOWED_ATTRIBUTES: Record<string, Set<string>> = {
    a: new Set(['href', 'title', 'target', 'rel']),
};

// Only the characters a URL scheme can legally contain are kept before the scheme is
// checked. Whitespace and control characters are how an executable scheme gets past
// such a check — 'java<TAB>script:' reads as harmless until the browser parses it.
const SCHEME_NOISE = /[^a-z0-9+.:-]/g;

function isSafeHref(value: string): boolean {
    // javascript:, data: and vbscript: are the executable ones.
    const scheme = value.trim().toLowerCase().replace(SCHEME_NOISE, '');
    if (!scheme) return true;
    if (scheme.startsWith('javascript:') || scheme.startsWith('data:') || scheme.startsWith('vbscript:')) {
        return false;
    }
    return true;
}

function sanitizeAttributes(tag: string, attrs: string): string {
    const allowed = ALLOWED_ATTRIBUTES[tag];
    if (!allowed) return '';

    const kept: string[] = [];
    const pattern = /([a-zA-Z-]+)\s*=\s*("([^"]*)"|'([^']*)')/g;
    let match: RegExpExecArray | null;

    while ((match = pattern.exec(attrs)) !== null) {
        const name = (match[1] || '').toLowerCase();
        const value = match[3] ?? match[4] ?? '';

        if (!allowed.has(name)) continue;
        if (name === 'href' && !isSafeHref(value)) continue;

        kept.push(`${name}="${value.replace(/"/g, '&quot;')}"`);
    }

    // A link that opens a new tab gets rel=noopener, so the opened page cannot reach
    // back into this one through window.opener.
    if (tag === 'a' && kept.some((a) => a.startsWith('target='))) {
        if (!kept.some((a) => a.startsWith('rel='))) kept.push('rel="noopener noreferrer"');
    }

    return kept.length > 0 ? ' ' + kept.join(' ') : '';
}

/** Sanitises one HTML string. */
export function sanitizeHtml(input: unknown): string {
    if (typeof input !== 'string') return '';

    let html = input;

    // Whole elements whose CONTENT is dangerous, not just their tags: leaving the text
    // of a <script> behind would put the code straight into the page.
    html = html.replace(/<(script|style|iframe|object|embed|noscript|template)\b[\s\S]*?<\/\1\s*>/gi, '');
    html = html.replace(/<(script|style|iframe|object|embed|noscript|template)\b[^>]*\/?>/gi, '');

    // Comments can hide conditional markup.
    html = html.replace(/<!--[\s\S]*?-->/g, '');

    // Everything else: keep the tag if it is on the list, with only its safe attributes.
    html = html.replace(/<\s*(\/?)\s*([a-zA-Z][a-zA-Z0-9]*)((?:[^>"']|"[^"]*"|'[^']*')*)>/g,
        (_full, closing: string, rawTag: string, attrs: string) => {
            const tag = rawTag.toLowerCase();
            if (!ALLOWED_TAGS.has(tag)) return '';
            if (closing) return `</${tag}>`;
            return `<${tag}${sanitizeAttributes(tag, attrs)}>`;
        });

    // Any stray angle bracket that is not part of a tag we kept.
    html = html.replace(/<(?![a-zA-Z/])/g, '&lt;');

    return html;
}

/**
 * Sanitises every string in a CMS payload, however deeply nested.
 *
 * The CMS stores free-form objects, and which fields are rendered as HTML changes with
 * the page. Sanitising all of them means a new field cannot quietly become a hole.
 */
export function sanitizeContent(value: unknown): unknown {
    if (typeof value === 'string') return sanitizeHtml(value);
    if (Array.isArray(value)) return value.map(sanitizeContent);
    if (value && typeof value === 'object') {
        const out: Record<string, unknown> = {};
        for (const [key, inner] of Object.entries(value as Record<string, unknown>)) {
            out[key] = sanitizeContent(inner);
        }
        return out;
    }
    return value;
}
