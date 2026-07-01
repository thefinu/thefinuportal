import Link from "next/link";
import { Mail, MapPin, ShieldCheck, Zap, Heart, LifeBuoy } from "lucide-react";

const INSTALL_LINK = "https://workspace.google.com/marketplace/app/thefinu/123456789";

export default function PublicFooter() {
    return (
        <footer className="bg-slate-950 relative overflow-hidden">
            {/* Subtle top gradient line */}
            <div className="h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Main footer grid */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-8 md:gap-12 py-14">
                    {/* Brand column */}
                    <div className="col-span-2 md:col-span-2">
                        <Link href="/">
                            <img src="/logo.png" alt="ThefinU Logo" className="h-20 mb-5" />
                        </Link>
                        <p className="text-slate-400 text-sm leading-relaxed mb-5 max-w-xs">
                            Automated personal finance tracking directly in Google Sheets™. Secure, simple, and fully customizable.
                        </p>
                        <div className="flex items-center gap-4 text-sm text-slate-500">
                            <div className="flex items-center gap-1.5">
                                <MapPin className="h-3.5 w-3.5" />
                                Denver, CO
                            </div>
                            <div className="flex items-center gap-1.5">
                                <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                                SOC 2
                            </div>
                        </div>
                    </div>

                    {/* Product */}
                    <div>
                        <h4 className="font-bold text-white mb-5 uppercase text-[11px] tracking-[0.15em]">Product</h4>
                        <ul className="space-y-3 text-sm text-slate-400 font-medium">
                            <li><Link href="/#features" className="hover:text-white transition-colors">Features</Link></li>
                            <li><Link href="/#how-it-works" className="hover:text-white transition-colors">How it Works</Link></li>
                            <li><Link href="/#pricing" className="hover:text-white transition-colors">Pricing</Link></li>
                            <li><Link href="/#what-people-say" className="hover:text-white transition-colors">Reviews</Link></li>
                        </ul>
                    </div>

                    {/* Company */}
                    <div>
                        <h4 className="font-bold text-white mb-5 uppercase text-[11px] tracking-[0.15em]">Company</h4>
                        <ul className="space-y-3 text-sm text-slate-400 font-medium">
                            <li><Link href="/about" className="hover:text-white transition-colors">About</Link></li>
                            <li><Link href="/contact" className="hover:text-white transition-colors">Contact</Link></li>
                            <li><Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link></li>
                            <li><Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
                        </ul>
                    </div>

                    {/* Support */}
                    <div>
                        <h4 className="font-bold text-white mb-5 uppercase text-[11px] tracking-[0.15em]">Support</h4>
                        <ul className="space-y-3 text-sm text-slate-400 font-medium">
                            <li>
                                <Link href="/help" className="hover:text-white transition-colors flex items-center gap-2">
                                    <LifeBuoy className="h-3.5 w-3.5" />
                                    Help Center
                                </Link>
                            </li>
                            <li>
                                <a href="mailto:support@thefinu.com" className="hover:text-white transition-colors flex items-center gap-2">
                                    <Mail className="h-3.5 w-3.5" />
                                    support@thefinu.com
                                </a>
                            </li>
                            <li>
                                <a href={INSTALL_LINK} target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors flex items-center gap-2">
                                    <Zap className="h-3.5 w-3.5" />
                                    Google Workspace™
                                </a>
                            </li>
                        </ul>
                    </div>
                </div>

                {/* Bottom bar */}
                <div className="py-6 border-t border-slate-800/60 flex flex-col md:flex-row justify-between items-center text-[13px] text-slate-500 gap-4">
                    <p className="flex items-center gap-1">
                        &copy; {new Date().getFullYear()} ThefinU, LLC. Built with <Heart className="h-3 w-3 text-primary inline" /> in Colorado.
                    </p>
                    <div className="flex items-center gap-6">
                        <Link href="/terms" className="hover:text-slate-300 transition-colors">Terms</Link>
                        <Link href="/privacy" className="hover:text-slate-300 transition-colors">Privacy</Link>
                    </div>
                </div>
            </div>
        </footer>
    );
}
