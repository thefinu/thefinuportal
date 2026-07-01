// ──────────────────────────────────────────────────────────────────────────
// Help Center content (public)
//
// Two-level hierarchy:  Help home  →  Collection  →  Article
// Content is hardcoded here. To render an icon, store its key (see iconMap in
// the help pages) — keeping this module a pure, serializable data source.
// ──────────────────────────────────────────────────────────────────────────

export type IconKey = "rocket" | "wallet" | "template" | "shield" | "sparkles";

export type ArticleBlock =
    | { type: "heading"; text: string }
    | { type: "paragraph"; text: string }
    | { type: "list"; items: string[] }
    | { type: "steps"; items: { title: string; desc: string }[] }
    | { type: "callout"; text: string };

export interface Article {
    slug: string;
    title: string;
    excerpt: string;
    body: ArticleBlock[];
}

export interface Collection {
    slug: string;
    title: string;
    description: string;
    icon: IconKey;
    articles: Article[];
}

export const HELP_CENTER = {
    tagline: "Advice and answers from the ThefinU Team",
    collections: [
        {
            slug: "getting-started",
            title: "Getting Started with ThefinU",
            description: "Learn how to start using ThefinU within Google Sheets™.",
            icon: "rocket",
            articles: [
                {
                    slug: "get-started-in-3-easy-steps",
                    title: "Get Started in 3 Easy Steps",
                    excerpt:
                        "Install the add-on, link your accounts, and let ThefinU sync your finances into Google Sheets™ — automatically.",
                    body: [
                        {
                            type: "paragraph",
                            text: "ThefinU lives right inside Google Sheets™ as an add-on. Once installed, it syncs your bank transactions, balances, and investments into your spreadsheet so you can track everything with zero manual entry. Here's how to get up and running in just three steps.",
                        },
                        {
                            type: "steps",
                            items: [
                                {
                                    title: "Install the ThefinU add-on",
                                    desc: "Add ThefinU from the Google Workspace™ Marketplace, open any Google Sheet™, then launch it from Extensions → ThefinU. The setup wizard walks you through installing a starter template.",
                                },
                                {
                                    title: "Link your accounts",
                                    desc: "Securely connect your banks, credit cards, investments, and loans through Plaid — the same infrastructure trusted by Venmo and Robinhood. Your credentials go directly to Plaid; ThefinU never sees them.",
                                },
                                {
                                    title: "Get automatic reports",
                                    desc: "Your transactions and balances sync automatically every day. Use the ready-made templates to generate monthly and yearly budgets, net-worth trends, and spending breakdowns.",
                                },
                            ],
                        },
                        { type: "heading", text: "What the add-on does for you" },
                        {
                            type: "paragraph",
                            text: "The ThefinU add-on is the engine that keeps your spreadsheet up to date. Once your accounts are linked, these features run quietly in the background:",
                        },
                        {
                            type: "list",
                            items: [
                                "Automatic daily syncs — transactions, balances, and accounts refresh every day, no CSV imports needed.",
                                "Multi-account support — banks, credit cards, investments, loans, and crypto all flow into one spreadsheet.",
                                "Smart categorization — categories classify transactions so you can instantly see where your money goes.",
                                "Ready-made templates — budget trackers, net-worth dashboards, and expense reports work out of the box.",
                                "Budget reports — generate monthly and yearly budgets and spending breakdowns from your transactions.",
                                "Works on any device — desktop, tablet, or phone, because it's just a Google Sheet™.",
                            ],
                        },
                        {
                            type: "callout",
                            text: "Tip: Run your first sync right after linking an account. The full transaction history imports instantly, so your reports are useful from day one.",
                        },
                    ],
                },
                {
                    slug: "installing-the-add-on",
                    title: "Installing the ThefinU Add-on",
                    excerpt: "Add ThefinU to Google Sheets™ from the Workspace Marketplace and open it from the Extensions menu.",
                    body: [
                        {
                            type: "paragraph",
                            text: "ThefinU is a Google Workspace™ add-on, so there's nothing to download to your computer. Installation takes about a minute.",
                        },
                        {
                            type: "steps",
                            items: [
                                { title: "Open the Marketplace listing", desc: "Visit the ThefinU listing on the Google Workspace™ Marketplace and click Install." },
                                { title: "Grant permissions", desc: "Approve the requested Google permissions. ThefinU only needs access to the spreadsheets you use it in." },
                                { title: "Open it in a Sheet", desc: "Open any Google Sheet™ and go to Extensions → ThefinU to launch the setup wizard." },
                            ],
                        },
                        {
                            type: "callout",
                            text: "If you don't see ThefinU under Extensions, refresh the spreadsheet tab after installing.",
                        },
                    ],
                },
                {
                    slug: "understanding-add-on-features",
                    title: "Understanding the Add-on Features",
                    excerpt: "A tour of what the ThefinU add-on can do — syncing, categorization, templates, and reports.",
                    body: [
                        {
                            type: "paragraph",
                            text: "Everything ThefinU offers is designed to give finance-app power with spreadsheet flexibility. Here's a closer look at each feature.",
                        },
                        { type: "heading", text: "Automatic daily syncs" },
                        { type: "paragraph", text: "Transactions, balances, and accounts refresh automatically every day — completely hands-free. New transactions typically appear within hours of posting." },
                        { type: "heading", text: "Smart categorization" },
                        { type: "paragraph", text: "Categories help classify your transactions automatically, making it easy to see where your money goes without tagging everything by hand." },
                        { type: "heading", text: "Templates & reports" },
                        { type: "paragraph", text: "Start from premade budget trackers and net-worth dashboards, then generate monthly and yearly reports straight from your transaction data." },
                    ],
                },
            ],
        },
        {
            slug: "connecting-your-finances",
            title: "Connecting Your Finances",
            description: "Learn how to link with financial institutions and manage your accounts.",
            icon: "wallet",
            articles: [
                {
                    slug: "linking-your-bank-with-plaid",
                    title: "Linking Your Bank with Plaid",
                    excerpt: "Connect 12,000+ institutions securely through Plaid with read-only access.",
                    body: [
                        { type: "paragraph", text: "ThefinU connects to your financial institutions through Plaid — the same service used by Venmo, Robinhood, and thousands of apps. Your login credentials go directly to Plaid and are never visible to ThefinU." },
                        {
                            type: "list",
                            items: [
                                "Connect with 12,000+ banks across 50+ countries via Plaid.",
                                "Link checking, savings, credit cards, investments, and loans.",
                                "Read-only access — ThefinU can never move or initiate transactions.",
                                "Transaction history is imported instantly when you connect.",
                            ],
                        },
                        { type: "callout", text: "Your data is protected with 256-bit encryption and read-only access only." },
                    ],
                },
                {
                    slug: "managing-connected-accounts",
                    title: "Managing Connected Accounts",
                    excerpt: "Add, refresh, or remove linked institutions and keep your accounts current.",
                    body: [
                        { type: "paragraph", text: "You can connect as many institutions as you like and manage them at any time from the add-on panel." },
                        {
                            type: "list",
                            items: [
                                "Add another institution anytime from the ThefinU panel.",
                                "Trigger a manual refresh if you want the latest data immediately.",
                                "Remove an institution to stop syncing it — your existing data stays in the sheet.",
                            ],
                        },
                    ],
                },
                {
                    slug: "how-often-data-syncs",
                    title: "How Often Your Data Syncs",
                    excerpt: "Understand the automatic daily sync schedule and how to refresh on demand.",
                    body: [
                        { type: "paragraph", text: "ThefinU syncs your accounts automatically every day. New transactions typically appear within hours of posting at your institution." },
                        { type: "paragraph", text: "If you need the most current data right away, you can run a manual sync from the add-on at any time." },
                    ],
                },
            ],
        },
        {
            slug: "sheet-templates",
            title: "Working with Sheet Templates",
            description: "Learn how to use ThefinU's free sheet templates.",
            icon: "template",
            articles: [
                {
                    slug: "using-the-free-templates",
                    title: "Using the Free Templates",
                    excerpt: "Budget trackers, net-worth dashboards, and expense reports that work out of the box.",
                    body: [
                        { type: "paragraph", text: "ThefinU ships with professionally designed templates so you don't have to build your spreadsheet from scratch. They're installed for you during the setup wizard." },
                        {
                            type: "list",
                            items: [
                                "Budget trackers for monthly and yearly planning.",
                                "Net-worth dashboards that update as your balances change.",
                                "Expense reports and spending breakdowns by category.",
                            ],
                        },
                        { type: "callout", text: "Templates are regular Google Sheets™ — power users can customize every formula, chart, and tab." },
                    ],
                },
                {
                    slug: "customizing-your-spreadsheet",
                    title: "Customizing Your Spreadsheet",
                    excerpt: "Tailor the templates to your own workflow without breaking the sync.",
                    body: [
                        { type: "paragraph", text: "Because everything is a standard Google Sheet™, you're free to add tabs, charts, and formulas. ThefinU writes to its own data sheets, so your customizations stay intact across syncs." },
                        { type: "callout", text: "Avoid renaming or deleting the ThefinU data tabs — those are where synced transactions and balances are written." },
                    ],
                },
            ],
        },
    ] as Collection[],
};

export function getCollection(slug: string): Collection | undefined {
    return HELP_CENTER.collections.find((c) => c.slug === slug);
}

export function getArticle(
    collectionSlug: string,
    articleSlug: string
): { collection: Collection; article: Article } | undefined {
    const collection = getCollection(collectionSlug);
    const article = collection?.articles.find((a) => a.slug === articleSlug);
    if (!collection || !article) return undefined;
    return { collection, article };
}
