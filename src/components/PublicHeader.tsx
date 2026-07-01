"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { Menu, X } from "lucide-react";

export default function PublicHeader({ onDark = false }: { onDark?: boolean }) {
    const [scrolled, setScrolled] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 20);
        };
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    // Light treatment only while transparent over a dark hero band.
    // Once scrolled the header turns solid white, so it reverts to dark styling.
    const light = onDark && !scrolled;
    const linkCls = `text-sm font-semibold transition-colors ${light ? "text-white/85 hover:text-white" : "text-slate-600 hover:text-primary"}`;

    return (
        <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${scrolled
                ? "bg-white/90 backdrop-blur-xl border-b border-slate-100 py-3 shadow-sm"
                : "bg-transparent py-5"
            }`}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center">
                    {/* Logo */}
                    <div className="flex items-center">
                        <Link href="/" className="flex items-center">
                            {light ? (
                                // On a dark hero the teal wordmark/shield blends in — set it on a light lockup chip.
                                <span className="inline-flex items-center rounded-xl bg-white/95 px-3.5 py-2 shadow-sm ring-1 ring-white/20">
                                    <img src="/logo-full.png" alt="ThefinU Logo" className="h-12 w-auto" />
                                </span>
                            ) : (
                                <img src="/logo-full.png" alt="ThefinU Logo" className="h-16 w-auto" />
                            )}
                        </Link>
                    </div>

                    {/* Desktop nav */}
                    <div className="hidden md:flex items-center gap-8">
                        <Link href="/#features" className={linkCls}>
                            Features
                        </Link>
                        <Link href="/#how-it-works" className={linkCls}>
                            How it Works
                        </Link>
                        <Link href="/#pricing" className={linkCls}>
                            Pricing
                        </Link>
                        <Link href="/about" className={linkCls}>
                            About
                        </Link>
                        <Link href="/contact" className={linkCls}>
                            Contact
                        </Link>
                    </div>


                    {/* Mobile menu button */}
                    <button
                        className={`md:hidden p-2 rounded-lg transition-colors ${light ? "text-white hover:bg-white/10" : "text-slate-600 hover:bg-slate-100"}`}
                        onClick={() => setMobileOpen(!mobileOpen)}
                    >
                        {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                    </button>
                </div>

                {/* Mobile menu */}
                {mobileOpen && (
                    <div className={`md:hidden mt-4 pb-4 border-t pt-4 space-y-1 animate-slide-up ${light ? "border-white/20" : "border-slate-100"}`}>
                        {[
                            { href: "/#features", label: "Features" },
                            { href: "/#how-it-works", label: "How it Works" },
                            { href: "/#what-people-say", label: "Reviews" },
                            { href: "/#pricing", label: "Pricing" },
                            { href: "/about", label: "About" },
                            { href: "/contact", label: "Contact" },
                        ].map((link) => (
                            <Link
                                key={link.href}
                                href={link.href}
                                onClick={() => setMobileOpen(false)}
                                className={`block px-4 py-3 text-sm font-semibold rounded-xl transition-colors ${light ? "text-white/85 hover:text-white hover:bg-white/10" : "text-slate-600 hover:text-primary hover:bg-primary/5"}`}
                            >
                                {link.label}
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </nav>
    );
}
