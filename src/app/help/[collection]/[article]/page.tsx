"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import PublicHeader from "@/components/PublicHeader";
import PublicFooter from "@/components/PublicFooter";
import { ChevronRight, ArrowLeft, Lightbulb, Check } from "lucide-react";
import { getArticle, getCollection, type ArticleBlock } from "@/lib/helpCenter";

function Block({ block }: { block: ArticleBlock }) {
    switch (block.type) {
        case "heading":
            return <h2 className="text-lg font-bold text-slate-900 mt-8 mb-3">{block.text}</h2>;
        case "paragraph":
            return <p className="text-sm text-slate-600 leading-relaxed mb-4">{block.text}</p>;
        case "list":
            return (
                <ul className="space-y-2.5 mb-5">
                    {block.items.map((item, i) => (
                        <li key={i} className="flex items-start gap-3 text-sm text-slate-600 leading-relaxed">
                            <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                            <span>{item}</span>
                        </li>
                    ))}
                </ul>
            );
        case "steps":
            return (
                <ol className="space-y-4 mb-6">
                    {block.items.map((step, i) => (
                        <li key={i} className="flex items-start gap-4">
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-bold">{i + 1}</span>
                            <div className="pt-0.5">
                                <h3 className="text-sm font-semibold text-slate-800">{step.title}</h3>
                                <p className="text-sm text-slate-600 mt-1 leading-relaxed">{step.desc}</p>
                            </div>
                        </li>
                    ))}
                </ol>
            );
        case "callout":
            return (
                <div className="flex items-start gap-3 rounded-xl border border-primary/15 bg-primary/5 px-5 py-4 mb-5">
                    <Lightbulb className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <p className="text-sm text-slate-700 leading-relaxed">{block.text}</p>
                </div>
            );
        default:
            return null;
    }
}

export default function ArticlePage() {
    const params = useParams<{ collection: string; article: string }>();
    const found = getArticle(params.collection, params.article);
    const collection = found?.collection ?? getCollection(params.collection);

    return (
        <div className="flex flex-col min-h-screen bg-background-soft text-slate-900 font-sans selection:bg-primary/10">
            <PublicHeader onDark />

            <main className="flex-grow">
                {/* ── HERO BAND ── */}
                <section className="relative bg-gradient-to-br from-primary to-secondary pt-32 pb-10 lg:pt-36 lg:pb-12 overflow-hidden">
                    <div className="absolute inset-0 opacity-[0.15]" style={{ backgroundImage: "radial-gradient(rgba(255,255,255,0.6) 1px, transparent 1px)", backgroundSize: "24px 24px" }} />
                    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                        {/* Breadcrumb */}
                        <nav className="flex flex-wrap items-center gap-2 text-xs font-medium text-white/70">
                            <Link href="/help" className="hover:text-white transition-colors">Help Center</Link>
                            {collection && (
                                <>
                                    <ChevronRight className="h-3.5 w-3.5" />
                                    <Link href={`/help/${collection.slug}`} className="hover:text-white transition-colors">{collection.title}</Link>
                                </>
                            )}
                            {found && (
                                <>
                                    <ChevronRight className="h-3.5 w-3.5" />
                                    <span className="text-white">{found.article.title}</span>
                                </>
                            )}
                        </nav>

                        {found && (
                            <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight mt-5">{found.article.title}</h1>
                        )}
                    </div>
                </section>

                {/* ── BODY ── */}
                <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                    {found ? (
                        <div className="grid lg:grid-cols-[1fr_280px] gap-10">
                            {/* Article content */}
                            <article className="bg-white rounded-xl border border-slate-200 shadow-sm p-7 md:p-9">
                                {found.article.body.map((block, i) => (
                                    <Block key={i} block={block} />
                                ))}

                                <div className="mt-10 pt-6 border-t border-slate-100">
                                    <Link href={`/help/${found.collection.slug}`} className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline">
                                        <ArrowLeft className="h-4 w-4" /> Back to {found.collection.title}
                                    </Link>
                                </div>
                            </article>

                            {/* Sibling articles */}
                            <aside className="lg:pt-2">
                                <h3 className="text-[11px] font-bold uppercase tracking-[0.15em] text-slate-400 mb-3">
                                    More in this collection
                                </h3>
                                <ul className="space-y-1">
                                    {found.collection.articles.map((a) => {
                                        const active = a.slug === found.article.slug;
                                        return (
                                            <li key={a.slug}>
                                                <Link
                                                    href={`/help/${found.collection.slug}/${a.slug}`}
                                                    className={`block rounded-lg px-3 py-2 text-sm transition-colors ${
                                                        active
                                                            ? "bg-primary/10 text-primary font-semibold"
                                                            : "text-slate-600 hover:bg-slate-100"
                                                    }`}
                                                >
                                                    {a.title}
                                                </Link>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </aside>
                        </div>
                    ) : (
                        <div className="text-center py-10">
                            <p className="text-sm text-slate-500 mb-6">We couldn&apos;t find that article.</p>
                            <Link href="/help" className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline">
                                <ArrowLeft className="h-4 w-4" /> Back to Help Center
                            </Link>
                        </div>
                    )}
                </section>
            </main>

            <PublicFooter />
        </div>
    );
}
