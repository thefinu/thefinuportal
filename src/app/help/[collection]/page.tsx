"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import PublicHeader from "@/components/PublicHeader";
import PublicFooter from "@/components/PublicFooter";
import { ChevronRight, FileText, Rocket, Wallet, LayoutTemplate, ShieldCheck, Sparkles, ArrowLeft, type LucideIcon } from "lucide-react";
import { getCollection, type IconKey } from "@/lib/helpCenter";

const iconMap: Record<IconKey, LucideIcon> = {
    rocket: Rocket,
    wallet: Wallet,
    template: LayoutTemplate,
    shield: ShieldCheck,
    sparkles: Sparkles,
};

export default function CollectionPage() {
    const params = useParams<{ collection: string }>();
    const collection = getCollection(params.collection);

    return (
        <div className="flex flex-col min-h-screen bg-background-soft text-slate-900 font-sans selection:bg-primary/10">
            <PublicHeader onDark />

            <main className="flex-grow">
                {/* ── HERO BAND ── */}
                <section className="relative bg-gradient-to-br from-primary to-secondary pt-32 pb-12 lg:pt-36 lg:pb-14 overflow-hidden">
                    <div className="absolute inset-0 opacity-[0.15]" style={{ backgroundImage: "radial-gradient(rgba(255,255,255,0.6) 1px, transparent 1px)", backgroundSize: "24px 24px" }} />
                    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                        {/* Breadcrumb */}
                        <nav className="flex items-center gap-2 text-xs font-medium text-white/70 mb-5">
                            <Link href="/help" className="hover:text-white transition-colors">Help Center</Link>
                            {collection && (
                                <>
                                    <ChevronRight className="h-3.5 w-3.5" />
                                    <span className="text-white">{collection.title}</span>
                                </>
                            )}
                        </nav>

                        {collection ? (
                            <div className="flex items-start gap-4">
                                {(() => {
                                    const Icon = iconMap[collection.icon] ?? FileText;
                                    return (
                                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/15 text-white">
                                            <Icon className="h-6 w-6" />
                                        </div>
                                    );
                                })()}
                                <div>
                                    <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">{collection.title}</h1>
                                    <p className="text-sm text-white/80 mt-1.5 leading-relaxed">{collection.description}</p>
                                </div>
                            </div>
                        ) : (
                            <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">Collection not found</h1>
                        )}
                    </div>
                </section>

                {/* ── ARTICLES ── */}
                <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                    {collection ? (
                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden divide-y divide-slate-100">
                            {collection.articles.map((article) => (
                                <Link
                                    key={article.slug}
                                    href={`/help/${collection.slug}/${article.slug}`}
                                    className="group flex items-start gap-4 px-6 py-5 hover:bg-slate-50 transition-colors"
                                >
                                    <FileText className="h-5 w-5 text-secondary mt-0.5 shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <h2 className="text-sm font-semibold text-slate-800 group-hover:text-primary transition-colors">{article.title}</h2>
                                        <p className="text-sm text-slate-500 mt-1 leading-relaxed">{article.excerpt}</p>
                                    </div>
                                    <ChevronRight className="h-5 w-5 text-slate-300 self-center shrink-0 group-hover:text-primary transition-colors" />
                                </Link>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-10">
                            <p className="text-sm text-slate-500 mb-6">We couldn&apos;t find that collection.</p>
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
