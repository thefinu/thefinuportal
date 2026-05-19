"use client";

import Link from "next/link";
import PublicHeader from "@/components/PublicHeader";
import PublicFooter from "@/components/PublicFooter";
import {
    ArrowRight,
    ShieldCheck,
    Zap,
    Layers,
    CheckCircle2,
    Table as TableIcon,
    RefreshCw,
    Lock,
    Star,
    CreditCard,
    TrendingUp,
    PiggyBank,
    Building2,
    Landmark,
    BadgeCheck,
    BarChart3,
    Clock,
    Globe,
    Smartphone,
    FileSpreadsheet,
    DollarSign,
    LineChart,
    Wallet,
    CircleDollarSign,
    Users,
    Plus,
    Minus,
    ArrowUpRight
} from "lucide-react";
import { useState, useEffect, useRef } from "react";


function useReveal() {
    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    el.querySelectorAll('.reveal').forEach(child => child.classList.add('revealed'));
                    el.classList.add('revealed');
                }
            },
            { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
        );
        observer.observe(el);
        return () => observer.disconnect();
    }, []);
    return ref;
}

function AnimatedCounter({ end, suffix = "" }: { end: number; suffix?: string }) {
    const [count, setCount] = useState(0);
    const ref = useRef<HTMLSpanElement>(null);
    const hasAnimated = useRef(false);
    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting && !hasAnimated.current) {
                    hasAnimated.current = true;
                    let current = 0;
                    const increment = end / 60;
                    const timer = setInterval(() => {
                        current += increment;
                        if (current >= end) { setCount(end); clearInterval(timer); }
                        else setCount(Math.floor(current));
                    }, 33);
                }
            },
            { threshold: 0.5 }
        );
        if (ref.current) observer.observe(ref.current);
        return () => observer.disconnect();
    }, [end]);
    return <span ref={ref}>{count.toLocaleString()}{suffix}</span>;
}

function FAQItem({ q, a }: { q: string; a: string }) {
    const [open, setOpen] = useState(false);
    return (
        <div className="border-b border-slate-100 last:border-0">
            <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between py-5 text-left group cursor-pointer">
                <span className="text-sm font-semibold text-slate-900 group-hover:text-primary transition-colors pr-4">{q}</span>
                <div className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center transition-all duration-300 ${open ? 'bg-primary text-white rotate-0' : 'bg-slate-100 text-slate-400'}`}>
                    {open ? <Minus className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
                </div>
            </button>
            <div className={`faq-answer ${open ? 'open' : ''}`}>
                <div><p className="pb-5 text-slate-500 leading-relaxed text-sm">{a}</p></div>
            </div>
        </div>
    );
}


function StepScreenshot({ src, alt }: { src: string; alt: string }) {
    const [failed, setFailed] = useState(false);

    if (failed) {
        return (
            <div className="flex flex-col items-center justify-center text-center p-8 w-full">
                <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
                    <FileSpreadsheet className="w-7 h-7 text-slate-300" />
                </div>
                <p className="text-xs text-slate-400 font-medium">Screenshot placeholder</p>
                <p className="text-[10px] text-slate-300 mt-1">Add image to /public/steps/</p>
            </div>
        );
    }

    return (
        <img
            src={src}
            alt={alt}
            className="w-full h-full object-cover rounded-lg"
            onError={() => setFailed(true)}
        />
    );
}

function HowItWorksSection({ sectionRef, steps }: { sectionRef: React.RefObject<HTMLDivElement | null>; steps: typeof DEFAULT_STEPS_CMS }) {
    const [activeStep, setActiveStep] = useState(0);
    const merged = steps.items.map((item, i) => ({ ...STEP_META[i % STEP_META.length], ...item }));
    const step = merged[activeStep] || merged[0];

    return (
        <section id="how-it-works" className="py-20 bg-slate-50" ref={sectionRef}>
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-14 reveal">
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">How It Works</span>
                    <h2 className="text-2xl md:text-3xl font-bold text-slate-950 mt-2 mb-3">{steps.sectionHeading}</h2>
                    <p className="text-slate-400 max-w-md mx-auto text-sm">{steps.sectionSubheading}</p>
                </div>

                <div className="reveal">
                    <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-sm">
                        <div className="grid grid-cols-3 border-b border-slate-100">
                            {merged.map((s, i) => {
                                const isActive = activeStep === i;
                                return (
                                    <button key={i} onClick={() => setActiveStep(i)}
                                        className={`relative flex items-center gap-3 md:gap-4 px-4 py-5 md:px-6 md:py-6 transition-all duration-300 cursor-pointer ${i < merged.length - 1 ? 'border-r border-slate-100' : ''} ${isActive ? 'bg-white' : 'bg-slate-50/80 hover:bg-slate-50'}`}>
                                        <div className={`absolute bottom-0 left-0 right-0 h-[2px] transition-all duration-300 ${isActive ? 'bg-primary' : 'bg-transparent'}`} />
                                        <span className={`w-8 h-8 md:w-9 md:h-9 rounded-lg text-xs font-bold flex items-center justify-center shrink-0 transition-all duration-300 ${isActive ? 'bg-primary text-white' : 'bg-slate-200/70 text-slate-400'}`}>
                                            {i + 1}
                                        </span>
                                        <div className="hidden sm:block text-left min-w-0">
                                            <p className={`text-[10px] uppercase tracking-wider font-semibold transition-colors duration-300 ${isActive ? 'text-primary' : 'text-slate-300'}`}>Step {i + 1}</p>
                                            <h4 className={`text-sm font-bold truncate transition-colors duration-300 ${isActive ? 'text-slate-900' : 'text-slate-400'}`}>{s.title}</h4>
                                        </div>
                                        <span className={`sm:hidden text-xs font-bold transition-colors duration-300 ${isActive ? 'text-slate-900' : 'text-slate-400'}`}>{s.title}</span>
                                    </button>
                                );
                            })}
                        </div>

                        <div className="grid md:grid-cols-2">
                            <div className="bg-slate-50/50 p-6 md:p-10 flex items-center justify-center min-h-[280px] md:min-h-[400px] border-b md:border-b-0 md:border-r border-slate-100">
                                <StepScreenshot key={activeStep} src={step.screenshot} alt={step.title} />
                            </div>
                            <div className="p-6 md:p-10 flex flex-col justify-center">
                                <div className="flex items-center gap-3 mb-5">
                                    <div className={`w-10 h-10 rounded-xl ${step.iconBg} flex items-center justify-center`}>
                                        <step.icon className={`h-5 w-5 ${step.iconColor}`} />
                                    </div>
                                    <div className="h-px flex-1 bg-slate-100" />
                                    <span className="text-[10px] font-semibold text-slate-300 uppercase tracking-widest">{activeStep + 1} / {merged.length}</span>
                                </div>
                                <h3 className="text-xl md:text-2xl font-bold text-slate-900 mb-3">{step.title}</h3>
                                <p className="text-sm text-slate-400 leading-relaxed mb-7">{step.desc}</p>
                                <ul className="space-y-3.5">
                                    {step.points.map((point, j) => (
                                        <li key={j} className="flex items-start text-sm text-slate-600 leading-relaxed">
                                            <CheckCircle2 className={`h-4 w-4 ${step.iconColor} mr-2.5 shrink-0 mt-0.5`} />
                                            <span>{point}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}

const bankRows = [
    ["Chase", "Bank of America", "Wells Fargo", "Citi", "Capital One", "US Bank", "PNC", "TD Bank", "Ally", "Discover", "American Express", "Charles Schwab"],
    ["Fidelity", "Vanguard", "USAA", "Navy Federal", "SoFi", "Marcus", "Robinhood", "Coinbase", "PayPal", "Venmo", "Chime", "Wealthfront"]
];

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

const DEFAULT_HERO = {
    headline: "Automate Your Finances",
    headlineHighlight: "Google Sheets",
    subheading: "ThefinU syncs your bank transactions, balances, and investments directly into Google Sheets — track your finances with zero effort.",
};
const DEFAULT_FEATURES = {
    sectionHeading: "Everything you need to manage money",
    sectionSubheading: "Finance app power meets spreadsheet flexibility.",
    items: [
        { title: "Automatic daily syncs", desc: "Transactions, balances, and accounts sync per day. No CSV imports needed." },
        { title: "Ready-made templates", desc: "Budget trackers, net worth dashboards, expense reports — pro templates out of the box." },
        { title: "Multi-account support", desc: "Banks, credit cards, investments, loans, crypto — all visible in one spreadsheet." },
        { title: "Smart categorization", desc: "Categories help classify transactions, making it easier to see where your money goes." },
        { title: "Budget reports", desc: "Generate monthly and yearly budgets, net worth trends, and spending breakdowns — all from your account transactions." },
        { title: "Works on any device", desc: "Desktop, tablet, or phone — Google Sheets works seamlessly everywhere." },
    ],
};
const DEFAULT_STEPS_CMS = {
    sectionHeading: "Three simple steps",
    sectionSubheading: "Get started with automated finance tracking in minutes.",
    items: [
        { title: "Link your accounts", desc: "Securely connect your bank accounts, credit cards, investments, and loans through Plaid — the same infrastructure trusted by Venmo and Robinhood.", points: ["Connect with 12,000+ banks via Plaid", "Link checking, savings, cards, investments", "Get transaction history imported instantly"] },
        { title: "Get automatic updates", desc: "Your transactions, balances, and account details sync automatically per day — completely hands-free, zero manual entry.", points: ["Multiple daily updates — completely hands-free", "Transactions and balances always current", "Never manually enter data again"] },
        { title: "Make reports", desc: "Start with ready-made budget templates, then prepare the transactions sheets. Generate the reports monthly and yearly basis.", points: ["Premade templates", "Generate budgets, net worth trends, and spending breakdowns"] },
    ],
};
const DEFAULT_PRICING = {
    sectionHeading: "Simple, transparent pricing",
    sectionSubheading: "One plan. Everything included.",
    price: "$29",
    period: "/ year",
    monthlyEquiv: "$2.42/month",
    features: ["Unlimited bank connections", "Multiple daily auto-syncs", "Full transaction history", "Free templates", "Smart categorization", "Priority support", "14-day free trial"],
    whyItems: [
        { title: "Save 30+ hours/year", desc: "No more manual data entry or CSV exports." },
        { title: "Cheaper than alternatives", desc: "YNAB: $99/yr. Copilot: $96/yr. ThefinU: $29/yr." },
        { title: "Better awareness", desc: "Tracking spending reduces expenses by 15%." },
        { title: "Share with partner", desc: "Collaborate using Google Sheets sharing." },
    ],
};
const DEFAULT_FAQ = [
    { q: "How does ThefinU connect to my bank?", a: "Via Plaid — the same service used by Venmo, Robinhood, and thousands of apps. Your credentials go directly to Plaid; we never see them." },
    { q: "Is my financial data secure?", a: "Yes. 256-bit encryption, read-only access only. We can never initiate transactions or move your money." },
    { q: "What banks are supported?", a: "Over 12,000 institutions across 50+ countries — Chase, BofA, Wells Fargo, Fidelity, Vanguard, and many more." },
    { q: "How often does data sync?", a: "Multiple times per day automatically. New transactions typically appear within hours of posting." },
    { q: "Can I cancel anytime?", a: "Absolutely. Cancel from settings anytime. Your spreadsheet stays yours — it's a regular Google Sheet." },
    { q: "Do I need advanced spreadsheet skills?", a: "Not at all! Templates work out of the box. Power users can customize everything." },
];
const DEFAULT_CTA = {
    heading: "Ready to take control of your finances?",
    subheading: "Join thousands managing money smarter with ThefinU and Google Sheets.",
};
const DEFAULT_INSTALL_BTN = {
    label: "Install on Google Sheets",
    url: "https://workspace.google.com/marketplace/app/thefinu/123456789",
};

// Feature icons are fixed design elements; only text comes from CMS
const FEATURE_ICONS = [
    { icon: RefreshCw, color: "text-emerald-500" },
    { icon: Layers, color: "text-violet-500" },
    { icon: CreditCard, color: "text-rose-500" },
    { icon: BarChart3, color: "text-amber-500" },
    { icon: FileSpreadsheet, color: "text-blue-500" },
    { icon: Smartphone, color: "text-cyan-500" },
];
// Step icons/screenshots are fixed design elements; only text comes from CMS
const STEP_META = [
    { icon: CreditCard, iconColor: "text-blue-500", iconBg: "bg-blue-50", screenshot: "/steps/step-1-link-accounts.png" },
    { icon: RefreshCw, iconColor: "text-emerald-500", iconBg: "bg-emerald-50", screenshot: "/steps/step-2-auto-sync.png" },
    { icon: TrendingUp, iconColor: "text-violet-500", iconBg: "bg-violet-50", screenshot: "/steps/step-3-customize.png" },
];
// Why items icons are fixed
const WHY_ICONS = [
    { icon: Clock, color: "text-blue-500" },
    { icon: CircleDollarSign, color: "text-emerald-500" },
    { icon: LineChart, color: "text-amber-500" },
    { icon: Users, color: "text-violet-500" },
];

export default function HomePage() {
    const [isVisible, setIsVisible] = useState(false);
    const [hero, setHero] = useState(DEFAULT_HERO);
    const [features, setFeatures] = useState(DEFAULT_FEATURES);
    const [stepsCms, setStepsCms] = useState(DEFAULT_STEPS_CMS);
    const [pricing, setPricing] = useState(DEFAULT_PRICING);
    const [faqItems, setFaqItems] = useState(DEFAULT_FAQ);
    const [cta, setCta] = useState(DEFAULT_CTA);
    const [installBtn, setInstallBtn] = useState(DEFAULT_INSTALL_BTN);

    useEffect(() => {
        setIsVisible(true);
        const load = (section: string, setter: (d: any) => void) =>
            fetch(`${API_URL}/content/${section}`).then(r => r.json()).then(({ data }) => { if (data) setter(data); }).catch(() => {});
        load("home_hero", setHero);
        load("home_features", setFeatures);
        load("home_steps", setStepsCms);
        load("home_pricing", setPricing);
        load("home_faq", setFaqItems);
        load("home_cta", setCta);
        load("home_install", setInstallBtn);
    }, []);

    const statsRef = useReveal();
    const featuresRef = useReveal();
    const howRef = useReveal();
    const securityRef = useReveal();
    const pricingRef = useReveal();
    const faqRef = useReveal();

    return (
        <div className="flex flex-col min-h-screen bg-white text-slate-900 font-sans selection:bg-primary/10">
            <PublicHeader />

            <main className="flex-grow">

                {/* ── HERO ── */}
                <section className="relative pt-32 pb-10 lg:pt-44 lg:pb-10 overflow-hidden bg-slate-50">

                    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                        <div className="text-center">
                            <div className={`inline-flex items-center gap-2 border border-slate-200 rounded-full px-4 py-1.5 mb-8 transition-all duration-700 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'}`}>
                                <span className="relative flex h-1.5 w-1.5">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                                </span>
                                <span className="text-xs font-medium text-slate-500">Trusted by thousands of spreadsheet lovers</span>
                            </div>

                            <h1 className={`text-4xl md:text-5xl lg:text-[3.5rem] font-bold tracking-tight text-slate-950 mb-6 leading-[1.1] transition-all duration-1000 delay-100 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
                                {hero.headline}
                                <br className="hidden md:block" />
                                in <span className="text-primary">{hero.headlineHighlight}</span>
                            </h1>

                            <p className={`text-base md:text-lg text-slate-400 mb-10 max-w-xl mx-auto leading-relaxed transition-all duration-1000 delay-300 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
                                {hero.subheading}
                            </p>

                            <div className={`flex flex-col sm:flex-row items-center justify-center gap-4 transition-all duration-1000 delay-500 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
                                <a href={installBtn.url} target="_blank" rel="noopener noreferrer"
                                    className="group w-full sm:w-auto bg-slate-900 hover:bg-slate-800 text-white px-8 py-3.5 rounded-lg text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2 active:scale-[0.98] cursor-pointer">
                                    {installBtn.label}
                                    <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                                </a>
                            </div>

                            <div className={`mt-8 flex items-center justify-center gap-6 text-xs text-slate-400 transition-all duration-1000 delay-700 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
                                <span className="flex items-center gap-1.5"><BadgeCheck className="h-3.5 w-3.5 text-emerald-500" /> Free trial</span>
                                <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> 2-min setup</span>
                            </div>
                        </div>

                        {/* Dashboard Preview */}
                        <div className={`mt-10 lg:mt-10 relative transition-all duration-1000 delay-[800ms] ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-16 opacity-0'}`}>
                            <div className="rounded-xl shadow-2xl shadow-slate-900/10 border border-slate-200/80 overflow-hidden bg-white">
                                {/* Browser chrome */}
                                <div className="h-10 bg-slate-100 border-b border-slate-200 flex items-center px-4 gap-3">
                                    <div className="flex space-x-2">
                                        <div className="w-3 h-3 rounded-full bg-red-400/80" />
                                        <div className="w-3 h-3 rounded-full bg-amber-400/80" />
                                        <div className="w-3 h-3 rounded-full bg-emerald-400/80" />
                                    </div>
                                    <div className="flex-1 flex justify-center">
                                        <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-md px-3 py-1 max-w-sm w-full">
                                            <Lock className="h-2.5 w-2.5 text-emerald-500 shrink-0" />
                                            <span className="text-[11px] text-slate-400 truncate">docs.google.com/spreadsheets/d/thefinu-finance</span>
                                        </div>
                                    </div>
                                    <div className="w-14" />
                                </div>
                                {/* Screenshot */}
                                <img
                                    src="/dashboard-preview.png"
                                    alt="ThefinU Google Sheets Dashboard — transactions, categories, and linked accounts"
                                    className="w-full block"
                                />
                            </div>
                        </div>
                    </div>

                    {/* ── BANK LOGOS ── */}
                    <div className="mt-14 lg:mt-16 overflow-hidden">
                        <p className="text-center text-sm text-slate-400 mb-6 px-4">
                            Connects with <span className="font-semibold text-slate-600">12,000+</span> financial institutions via Plaid
                        </p>
                        <div className="space-y-2.5">
                            {bankRows.map((row, rowIndex) => (
                                <div key={rowIndex} className="relative">
                                    <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-slate-50 to-transparent z-10" />
                                    <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-slate-50 to-transparent z-10" />
                                    <div className={`flex gap-2.5 ${rowIndex === 0 ? 'animate-marquee' : 'animate-marquee-reverse'}`}>
                                        {[...row, ...row].map((bank, i) => (
                                            <div key={i} className="flex-shrink-0 px-3.5 py-2 bg-slate-50 rounded-lg border border-slate-100 text-xs font-medium text-slate-500 whitespace-nowrap flex items-center gap-1.5">
                                                <Building2 className="h-3 w-3 text-slate-300" />{bank}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* ── FEATURES ── */}
                <section id="features" className="py-20" ref={featuresRef}>
                    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="text-center mb-14 reveal">
                            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">Features</span>
                            <h2 className="text-2xl md:text-3xl font-bold text-slate-950 mt-2 mb-3">{features.sectionHeading}</h2>
                            <p className="text-slate-400 max-w-md mx-auto text-sm">{features.sectionSubheading}</p>
                        </div>

                        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {features.items.map((item, i) => {
                                const meta = FEATURE_ICONS[i % FEATURE_ICONS.length];
                                return (
                                    <div key={i} className={`reveal reveal-delay-${(i % 3) + 1} group p-6 rounded-xl border border-slate-100 hover:border-slate-200 transition-all duration-300`}>
                                        <meta.icon className={`h-5 w-5 ${meta.color} mb-4`} />
                                        <h4 className="text-sm font-bold text-slate-900 mb-1.5">{item.title}</h4>
                                        <p className="text-slate-400 leading-relaxed text-sm">{item.desc}</p>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </section>

                <div className="max-w-5xl mx-auto px-8"><div className="h-px bg-slate-100" /></div>

                {/* ── HOW IT WORKS ── */}
                <HowItWorksSection sectionRef={howRef} steps={stepsCms} />

                <div className="max-w-5xl mx-auto px-8"><div className="h-px bg-slate-100" /></div>


                {/* ── SECURITY ── */}
                <section className="py-20" ref={securityRef}>
                    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="text-center mb-14 reveal">
                            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">Security</span>
                            <h2 className="text-2xl md:text-3xl font-bold text-slate-950 mt-2 mb-3">Private and secure</h2>
                            <p className="text-slate-400 max-w-md mx-auto text-sm">
                                ThefinU never accesses your bank credentials and never sells your data.
                            </p>
                        </div>

                        <div className="reveal">
                            {/* Security badges */}
                            <div className="grid grid-cols-3 gap-4 md:gap-6 max-w-lg mx-auto mb-12">
                                {[
                                    { icon: Lock, label: "256-bit", desc: "AES Encryption", color: "text-blue-500", bg: "bg-blue-50" },
                                    { icon: BadgeCheck, label: "SOC 2", desc: "Compliant", color: "text-emerald-500", bg: "bg-emerald-50" },
                                    { icon: ShieldCheck, label: "Read-only", desc: "Access Only", color: "text-amber-500", bg: "bg-amber-50" },
                                ].map((b, i) => (
                                    <div key={i} className="text-center p-4 md:p-5 rounded-xl border border-slate-100 bg-white">
                                        <div className={`w-10 h-10 rounded-xl ${b.bg} flex items-center justify-center mx-auto mb-3`}>
                                            <b.icon className={`h-5 w-5 ${b.color}`} />
                                        </div>
                                        <div className="text-sm font-bold text-slate-900">{b.label}</div>
                                        <div className="text-[11px] text-slate-400 mt-0.5">{b.desc}</div>
                                    </div>
                                ))}
                            </div>

                            {/* Security details */}
                            <div className="bg-slate-950 rounded-xl p-8 md:p-10 max-w-2xl mx-auto">
                                <div className="grid sm:grid-cols-2 gap-6">
                                    {[
                                        { text: "Credentials never touch our servers", icon: Lock },
                                        { text: "Data encrypted in transit and at rest", icon: ShieldCheck },
                                        { text: "Read-only — we can never move money", icon: BadgeCheck },
                                        { text: "Disconnect accounts anytime", icon: CheckCircle2 },
                                    ].map((item, i) => (
                                        <div key={i} className="flex items-start gap-3">
                                            <item.icon className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                                            <span className="text-sm text-slate-300 leading-relaxed">{item.text}</span>
                                        </div>
                                    ))}
                                </div>
                                <div className="mt-8 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
                                    <p className="text-xs text-slate-500">Powered by <span className="text-white font-semibold">Plaid</span> — bank-level security infrastructure</p>
                                    <Link href="/privacy" className="text-sm text-white font-semibold hover:text-primary inline-flex items-center gap-1.5 group transition-colors">
                                        Privacy policy <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <div className="max-w-5xl mx-auto px-8"><div className="h-px bg-slate-100" /></div>

                {/* ── PRICING ── */}
                <section id="pricing" className="py-20 bg-slate-50" ref={pricingRef}>
                    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="text-center mb-14 reveal">
                            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">Pricing</span>
                            <h2 className="text-2xl md:text-3xl font-bold text-slate-950 mt-2 mb-3">{pricing.sectionHeading}</h2>
                            <p className="text-slate-400 text-sm">{pricing.sectionSubheading}</p>
                        </div>

                        <div className="reveal max-w-4xl mx-auto">
                            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                                <div className="grid md:grid-cols-5">
                                    {/* Left: Plan details */}
                                    <div className="md:col-span-3 p-8 md:p-10">
                                        <div className="flex items-center gap-3 mb-6">
                                            <span className="text-xs font-semibold text-primary uppercase tracking-wider bg-primary/5 px-3 py-1 rounded-full">ThefinU Pro</span>
                                            <span className="text-[10px] font-semibold text-white bg-slate-900 px-2.5 py-0.5 rounded-full uppercase tracking-wider">Best value</span>
                                        </div>
                                        <div className="flex items-end gap-1.5 mb-1">
                                            <span className="text-5xl font-bold text-slate-950">{pricing.price}</span>
                                            <span className="text-base text-slate-400 pb-1.5">{pricing.period}</span>
                                        </div>
                                        <p className="text-sm text-slate-400 mb-8">That&apos;s just <span className="font-semibold text-primary">{pricing.monthlyEquiv}</span> — less than a coffee</p>

                                        <div className="grid sm:grid-cols-2 gap-x-6 gap-y-3 mb-8">
                                            {pricing.features.map((f, i) => (
                                                <div key={i} className="flex items-center gap-2 text-sm text-slate-600">
                                                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />{f}
                                                </div>
                                            ))}
                                        </div>

                                        <a href={installBtn.url} target="_blank" rel="noopener noreferrer"
                                            className="group inline-flex bg-slate-900 hover:bg-slate-800 text-white px-8 py-3.5 rounded-lg text-sm font-semibold transition-all duration-200 items-center gap-2 active:scale-[0.98] cursor-pointer">
                                            {installBtn.label} <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                                        </a>
                                    </div>

                                    {/* Right: Why it's worth it */}
                                    <div className="md:col-span-2 bg-slate-50 p-8 md:p-10 border-t md:border-t-0 md:border-l border-slate-100">
                                        <h3 className="text-sm font-bold text-slate-900 mb-2">Why it&apos;s worth it</h3>
                                        <p className="text-xs text-slate-400 leading-relaxed mb-6">Most people spend 2-4 hours/month manually tracking finances. ThefinU saves all that.</p>
                                        <div className="space-y-5">
                                            {pricing.whyItems.map((item, i) => {
                                                const meta = WHY_ICONS[i % WHY_ICONS.length];
                                                return (
                                                    <div key={i} className="flex gap-3">
                                                        <meta.icon className={`h-4 w-4 ${meta.color} shrink-0 mt-0.5`} />
                                                        <div>
                                                            <div className="text-sm font-semibold text-slate-800">{item.title}</div>
                                                            <div className="text-xs text-slate-400 mt-0.5">{item.desc}</div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <div className="max-w-5xl mx-auto px-8"><div className="h-px bg-slate-100" /></div>

                {/* ── FAQ ── */}
                <section className="py-20" ref={faqRef}>
                    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="text-center mb-14 reveal">
                            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">FAQ</span>
                            <h2 className="text-2xl md:text-3xl font-bold text-slate-950 mt-2 mb-3">Frequently asked questions</h2>
                            <p className="text-slate-400 text-sm">Everything you need to know.</p>
                        </div>
                        <div className="reveal">
                            {faqItems.map((item, i) => <FAQItem key={i} q={item.q} a={item.a} />)}
                        </div>
                    </div>
                </section>

                {/* ── FINAL CTA ── */}
                <section className="py-20 bg-slate-950">
                    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                        <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                            {cta.heading}
                        </h2>
                        <p className="text-sm text-slate-400 mb-8 max-w-lg mx-auto">
                            {cta.subheading}
                        </p>
                        <a href={installBtn.url} target="_blank" rel="noopener noreferrer"
                            className="group inline-flex bg-white text-slate-900 px-8 py-3.5 rounded-lg text-sm font-semibold hover:bg-slate-100 active:scale-[0.98] transition-all duration-200 items-center gap-2 cursor-pointer">
                            {installBtn.label} <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                        </a>
                        <div className="mt-6 flex items-center justify-center gap-6 text-xs text-slate-500">
                            <span className="flex items-center gap-1.5"><BadgeCheck className="h-3.5 w-3.5 text-emerald-400" /> Free trial</span>
                            <span className="flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-emerald-400" /> Secure</span>
                            <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> 2-min setup</span>
                        </div>
                    </div>
                </section>
            </main>

            <PublicFooter />
        </div>
    );
}
