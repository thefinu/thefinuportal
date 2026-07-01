"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import PublicHeader from "@/components/PublicHeader";
import PublicFooter from "@/components/PublicFooter";
import { Search, ChevronRight, FileText, Rocket, Wallet, LayoutTemplate, ShieldCheck, Sparkles, type LucideIcon } from "lucide-react";
import { HELP_CENTER, type IconKey } from "@/lib/helpCenter";

const iconMap: Record<IconKey, LucideIcon> = {
    rocket: Rocket,
    wallet: Wallet,
    template: LayoutTemplate,
    shield: ShieldCheck,
    sparkles: Sparkles,
};

export default function HelpCenterPage() {
    const [query, setQuery] = useState("");

    // Flatten articles for search-as-you-type results.
    const results = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return [];
        return HELP_CENTER.collections.flatMap((c) =>
            c.articles
                .filter(
                    (a) =>
                        a.title.toLowerCase().includes(q) ||
                        a.excerpt.toLowerCase().includes(q) ||
                        c.title.toLowerCase().includes(q)
                )
                .map((a) => ({ collection: c, article: a }))
        );
    }, [query]);

    return (
        <div className="flex flex-col min-h-screen bg-background-soft text-slate-900 font-sans selection:bg-primary/10">
            <PublicHeader onDark />

            <main className="flex-grow">
                {/* ── HERO BAND ── */}
                <section className="relative bg-gradient-to-br from-primary to-secondary pt-32 pb-16 lg:pt-40 lg:pb-20 overflow-hidden">
                    <div className="absolute inset-0 opacity-[0.15]" style={{ backgroundImage: "radial-gradient(rgba(255,255,255,0.6) 1px, transparent 1px)", backgroundSize: "24px 24px" }} />
                    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
                        <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white tracking-tight mb-8">
                            {HELP_CENTER.tagline}
                        </h1>

                        {/* Search */}
                        <div className="relative max-w-2xl mx-auto">
                            <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                            <input
                                type="text"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="Search for answers…"
                                className="w-full rounded-xl bg-white/95 backdrop-blur-sm pl-14 pr-5 py-4 text-sm text-slate-800 shadow-lg placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-white/25"
                            />

                            {/* Search results dropdown */}
                            {query.trim() && (
                                <div className="absolute left-0 right-0 mt-2 bg-white rounded-xl shadow-2xl border border-slate-100 overflow-hidden text-left z-20">
                                    {results.length === 0 ? (
                                        <p className="px-5 py-4 text-sm text-slate-500">No articles found for “{query}”.</p>
                                    ) : (
                                        results.slice(0, 6).map(({ collection, article }) => (
                                            <Link
                                                key={`${collection.slug}/${article.slug}`}
                                                href={`/help/${collection.slug}/${article.slug}`}
                                                className="flex items-start gap-3 px-5 py-3.5 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0"
                                            >
                                                <FileText className="h-4 w-4 text-secondary mt-0.5 shrink-0" />
                                                <span>
                                                    <span className="block text-sm font-semibold text-slate-800">{article.title}</span>
                                                    <span className="block text-xs text-slate-400 mt-0.5">{collection.title}</span>
                                                </span>
                                            </Link>
                                        ))
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </section>

                {/* ── COLLECTIONS ── */}
                <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-14 space-y-5">
                    {HELP_CENTER.collections.map((collection) => {
                        const Icon = iconMap[collection.icon] ?? FileText;
                        return (
                            <Link
                                key={collection.slug}
                                href={`/help/${collection.slug}`}
                                className="group flex items-start gap-5 bg-white rounded-xl border border-slate-200 p-6 shadow-sm hover:shadow-md hover:border-primary/20 transition-all"
                            >
                                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                                    <Icon className="h-6 w-6" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h2 className="text-lg font-bold text-primary group-hover:underline">{collection.title}</h2>
                                    <p className="text-sm text-slate-600 mt-1 leading-relaxed">{collection.description}</p>
                                    <p className="text-xs text-slate-400 mt-3 font-medium">
                                        {collection.articles.length} {collection.articles.length === 1 ? "article" : "articles"} in this collection
                                    </p>
                                </div>
                                <ChevronRight className="h-5 w-5 text-slate-300 self-center shrink-0 group-hover:text-primary transition-colors" />
                            </Link>
                        );
                    })}
                </section>
            </main>

            <PublicFooter />
        </div>
    );
}
