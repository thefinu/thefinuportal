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
    Wallet,
    Plus,
    Minus,
    ArrowUpRight,
    PlayCircle
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
        <div className="border border-slate-200/70 rounded-2xl bg-white px-5 mb-3 transition-colors hover:border-coral/30">
            <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between py-5 text-left group cursor-pointer">
                <span className="text-sm font-semibold text-teal group-hover:text-coral transition-colors pr-4">{q}</span>
                <div className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center transition-all duration-300 ${open ? 'bg-coral text-white' : 'bg-cream text-teal/60'}`}>
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
                <div className="w-16 h-16 rounded-2xl bg-cream flex items-center justify-center mb-4">
                    <FileSpreadsheet className="w-7 h-7 text-teal/40" />
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
        <section id="how-it-works" className="py-24 bg-white" ref={sectionRef}>
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-14 reveal">
                    <span className="inline-block text-[11px] font-bold uppercase tracking-[0.2em] text-coral bg-coral/10 px-3 py-1 rounded-full">How It Works</span>
                    <h2 className="text-3xl md:text-4xl font-bold text-teal mt-4 mb-3">{steps.sectionHeading}</h2>
                    <p className="text-slate-500 max-w-md mx-auto text-sm">{steps.sectionSubheading}</p>
                </div>

                <div className="reveal">
                    <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-2xl shadow-teal/10">
                        <div className="grid grid-cols-3 border-b border-slate-100">
                            {merged.map((s, i) => {
                                const isActive = activeStep === i;
                                return (
                                    <button key={i} onClick={() => setActiveStep(i)}
                                        className={`relative flex items-center gap-3 md:gap-4 px-4 py-5 md:px-6 md:py-6 transition-all duration-300 cursor-pointer ${i < merged.length - 1 ? 'border-r border-slate-100' : ''} ${isActive ? 'bg-teal' : 'bg-white hover:bg-cream/40'}`}>
                                        <div className={`absolute bottom-0 left-0 right-0 h-[3px] transition-all duration-300 ${isActive ? 'bg-coral' : 'bg-transparent'}`} />
                                        <span className={`w-8 h-8 md:w-9 md:h-9 rounded-lg text-xs font-bold flex items-center justify-center shrink-0 transition-all duration-300 ${isActive ? 'bg-white/10 text-cream' : 'bg-cream text-teal/50'}`}>
                                            {i + 1}
                                        </span>
                                        <div className="hidden sm:block text-left min-w-0">
                                            <p className={`text-[10px] uppercase tracking-wider font-semibold transition-colors duration-300 ${isActive ? 'text-cream/80' : 'text-slate-400'}`}>Step {i + 1}</p>
                                            <h4 className={`text-sm font-bold truncate transition-colors duration-300 ${isActive ? 'text-white' : 'text-slate-500'}`}>{s.title}</h4>
                                        </div>
                                        <span className={`sm:hidden text-xs font-bold transition-colors duration-300 ${isActive ? 'text-white' : 'text-slate-500'}`}>{s.title}</span>
                                    </button>
                                );
                            })}
                        </div>

                        <div className="grid md:grid-cols-2">
                            <div className="bg-cream/30 p-6 md:p-10 flex items-center justify-center min-h-[280px] md:min-h-[400px] border-b md:border-b-0 md:border-r border-slate-100">
                                <StepScreenshot key={activeStep} src={step.screenshot} alt={step.title} />
                            </div>
                            <div className="p-6 md:p-10 flex flex-col justify-center">
                                <div className="flex items-center gap-3 mb-5">
                                    <div className="w-11 h-11 rounded-xl bg-teal flex items-center justify-center">
                                        <step.icon className="h-5 w-5 text-cream" />
                                    </div>
                                    <div className="h-px flex-1 bg-slate-100" />
                                    <span className="text-[10px] font-semibold text-slate-300 uppercase tracking-widest">{activeStep + 1} / {merged.length}</span>
                                </div>
                                <h3 className="text-xl md:text-2xl font-bold text-teal mb-3">{step.title}</h3>
                                <p className="text-sm text-slate-500 leading-relaxed mb-7">{step.desc}</p>
                                <ul className="space-y-3.5">
                                    {step.points.map((point, j) => (
                                        <li key={j} className="flex items-start text-sm text-slate-600 leading-relaxed">
                                            <CheckCircle2 className="h-4 w-4 text-coral mr-2.5 shrink-0 mt-0.5" />
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
    headlineHighlight: "Google Sheets™",
    subheading: "ThefinU syncs your bank transactions, balances, and investments directly into Google Sheets™ — track your finances with zero effort.",
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
        { title: "Works on any device", desc: "Desktop, tablet, or phone — Google Sheets™ works seamlessly everywhere." },
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
const DEFAULT_FAQ = [
    { q: "How does ThefinU connect to my bank?", a: "Via Plaid — the same service used by Venmo, Robinhood, and thousands of apps. Your credentials go directly to Plaid; we never see them." },
    { q: "Is my financial data secure?", a: "Yes. 256-bit encryption, read-only access only. We can never initiate transactions or move your money." },
    { q: "What banks are supported?", a: "Over 12,000 institutions across 50+ countries — Chase, BofA, Wells Fargo, Fidelity, Vanguard, and many more." },
    { q: "How often does data sync?", a: "Multiple times per day automatically. New transactions typically appear within hours of posting." },
    { q: "Can I cancel anytime?", a: "Absolutely. Cancel from settings anytime. Your spreadsheet stays yours — it's a regular Google Sheet™." },
    { q: "Do I need advanced spreadsheet skills?", a: "Not at all! Templates work out of the box. Power users can customize everything." },
];
const DEFAULT_CTA = {
    heading: "Ready to take control of your finances?",
    subheading: "Join thousands managing money smarter with ThefinU and Google Sheets™.",
};
const DEFAULT_INSTALL_BTN = {
    label: "Start your free trial",
    url: "https://workspace.google.com/marketplace/app/thefinu/123456789",
};

// Icon glyphs vary per feature; the badge styling stays consistent.
const FEATURE_ICONS = [RefreshCw, Layers, CreditCard, BarChart3, FileSpreadsheet, Smartphone];
// Step icons/screenshots are fixed design elements; only text comes from CMS
const STEP_META = [
    { icon: CreditCard, screenshot: "/steps/step-1-link-accounts.png" },
    { icon: RefreshCw, screenshot: "/steps/step-2-auto-sync.png" },
    { icon: TrendingUp, screenshot: "/steps/step-3-customize.png" },
];
interface PublicPlan {
    id: string;
    name: string;
    description: string;
    features: string[];
    monthlyPriceId: string;
    yearlyPriceId: string;
    monthlyAmount: number;
    yearlyAmount: number;
    saleMonthlyAmount: number;
    saleYearlyAmount: number;
    currency: string;
    trialDays: number;
    highlighted: boolean;
    badge: string;
    displayOrder: number;
}

type BillingInterval = "monthly" | "yearly";

function formatPrice(amount: number, currency: string) {
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: (currency || "usd").toUpperCase(),
        minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
    }).format(amount);
}

function PlanCards({
    plans,
    interval,
    setInterval,
    onSubscribe,
    busyId,
}: {
    plans: PublicPlan[];
    interval: BillingInterval;
    setInterval: (i: BillingInterval) => void;
    onSubscribe: (plan: PublicPlan) => void;
    busyId: string | null;
}) {
    // Show the interval toggle only if at least one plan offers each interval
    const anyMonthly = plans.some((p) => p.monthlyAmount > 0);
    const anyYearly = plans.some((p) => p.yearlyAmount > 0);
    const showToggle = anyMonthly && anyYearly;

    return (
        <div className="animate-slide-up">
            {showToggle && (
                <div className="flex items-center justify-center mb-10">
                    <div className="inline-flex items-center bg-white border border-slate-200 rounded-full p-1">
                        <button
                            onClick={() => setInterval("monthly")}
                            className={`px-5 py-2 rounded-full text-sm font-semibold transition-all ${interval === "monthly" ? "bg-teal text-white" : "text-slate-500 hover:text-teal"}`}
                        >
                            Monthly
                        </button>
                        <button
                            onClick={() => setInterval("yearly")}
                            className={`px-5 py-2 rounded-full text-sm font-semibold transition-all flex items-center gap-1.5 ${interval === "yearly" ? "bg-teal text-white" : "text-slate-500 hover:text-teal"}`}
                        >
                            Yearly
                            <span className="text-[10px] font-bold uppercase tracking-wide text-coral bg-coral/10 px-1.5 py-0.5 rounded-full">Save</span>
                        </button>
                    </div>
                </div>
            )}

            <div className={`grid gap-6 max-w-5xl mx-auto ${plans.length === 1 ? "max-w-md" : plans.length === 2 ? "md:grid-cols-2 max-w-3xl" : "md:grid-cols-3"}`}>
                {plans.map((plan) => {
                    const amount = interval === "yearly" ? plan.yearlyAmount : plan.monthlyAmount;
                    const saleAmount = interval === "yearly" ? plan.saleYearlyAmount : plan.saleMonthlyAmount;
                    const onSale = saleAmount > 0 && saleAmount < amount;
                    const displayAmount = onSale ? saleAmount : amount;
                    const available = amount > 0;
                    const period = interval === "yearly" ? "/ year" : "/ month";
                    const busy = busyId === plan.id;

                    return (
                        <div
                            key={plan.id}
                            className={`relative flex flex-col rounded-3xl border p-8 bg-white transition-all ${plan.highlighted ? "border-coral shadow-2xl shadow-coral/10 md:-translate-y-2" : "border-slate-200/70 shadow-xl shadow-teal/5"}`}
                        >
                            {(plan.badge || plan.highlighted) && (
                                <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] font-bold text-white bg-coral px-3 py-1 rounded-full uppercase tracking-wider whitespace-nowrap">
                                    {plan.badge || "Most Popular"}
                                </span>
                            )}

                            <h3 className="text-lg font-bold text-teal">{plan.name}</h3>
                            {plan.description && <p className="text-sm text-slate-500 mt-1 mb-5">{plan.description}</p>}

                            {onSale && available && (
                                <div className="flex items-center gap-2 mt-3">
                                    <span className="text-lg text-slate-400 line-through">{formatPrice(amount, plan.currency)}</span>
                                    <span className="text-[10px] font-bold uppercase tracking-wide text-white bg-rose-500 px-2 py-0.5 rounded-full">
                                        Save {formatPrice(amount - saleAmount, plan.currency)}
                                    </span>
                                </div>
                            )}
                            <div className={`flex items-end gap-1.5 mb-1 ${onSale && available ? "mt-1" : "mt-3"}`}>
                                {available ? (
                                    <>
                                        <span className="text-4xl font-bold text-teal">{formatPrice(displayAmount, plan.currency)}</span>
                                        <span className="text-sm text-slate-400 pb-1.5">{period}</span>
                                    </>
                                ) : (
                                    <span className="text-lg font-semibold text-slate-400">Not available {interval}</span>
                                )}
                            </div>
                            {available && interval === "yearly" && (
                                <p className="text-xs text-slate-400 mb-5">Billed annually</p>
                            )}
                            {plan.trialDays > 0 && (
                                <p className="text-xs text-coral font-medium mb-5">{plan.trialDays}-day free trial</p>
                            )}

                            <ul className="space-y-3 mb-8 flex-1">
                                {plan.features.map((f, i) => (
                                    <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                                        <CheckCircle2 className="h-4 w-4 text-sage shrink-0 mt-0.5" />
                                        <span>{f}</span>
                                    </li>
                                ))}
                            </ul>

                            <button
                                onClick={() => onSubscribe(plan)}
                                disabled={!available || busy}
                                className={`w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-sm font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${plan.highlighted ? "bg-coral text-white hover:-translate-y-0.5" : "bg-teal text-white hover:-translate-y-0.5"}`}
                            >
                                {busy ? "Redirecting…" : "Subscribe"}
                                {!busy && <ArrowRight className="h-4 w-4" />}
                            </button>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export default function HomePage() {
    const [isVisible, setIsVisible] = useState(false);
    const [hero, setHero] = useState(DEFAULT_HERO);
    const [features, setFeatures] = useState(DEFAULT_FEATURES);
    const [stepsCms, setStepsCms] = useState(DEFAULT_STEPS_CMS);
    const [faqItems, setFaqItems] = useState(DEFAULT_FAQ);
    const [cta, setCta] = useState(DEFAULT_CTA);
    const [installBtn, setInstallBtn] = useState(DEFAULT_INSTALL_BTN);
    const [plans, setPlans] = useState<PublicPlan[]>([]);
    const [billingInterval, setBillingInterval] = useState<BillingInterval>("yearly");
    const [checkoutBusy, setCheckoutBusy] = useState<string | null>(null);

    useEffect(() => {
        setIsVisible(true);
        const load = (section: string, setter: (d: any) => void) =>
            fetch(`${API_URL}/content/${section}`).then(r => r.json()).then(({ data }) => { if (data) setter(data); }).catch(() => {});
        load("home_hero", setHero);
        load("home_features", setFeatures);
        load("home_steps", setStepsCms);
        load("home_faq", setFaqItems);
        load("home_cta", setCta);
        load("home_install", setInstallBtn);

        fetch(`${API_URL}/plans/public`)
            .then(r => r.json())
            .then((data) => {
                if (Array.isArray(data) && data.length > 0) {
                    setPlans(data);
                    // Default the toggle to whichever interval the plans actually offer
                    if (!data.some((p: PublicPlan) => p.yearlyAmount > 0)) setBillingInterval("monthly");
                }
            })
            .catch(() => {});
    }, []);

    const handleSubscribe = async (plan: PublicPlan) => {
        setCheckoutBusy(plan.id);
        try {
            const res = await fetch(`${API_URL}/payment/create-website-checkout`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ planId: plan.id, interval: billingInterval }),
            });
            const data = await res.json();
            if (res.ok && data.url) {
                window.location.href = data.url;
            } else {
                alert(data.message || "Could not start checkout. Please try again.");
                setCheckoutBusy(null);
            }
        } catch {
            alert("Could not start checkout. Please try again.");
            setCheckoutBusy(null);
        }
    };

    const statsRef = useReveal();
    const featuresRef = useReveal();
    const howRef = useReveal();
    const securityRef = useReveal();
    const pricingRef = useReveal();
    const faqRef = useReveal();

    return (
        <div className="flex flex-col min-h-screen bg-white text-slate-900 font-sans selection:bg-coral/20">
            <PublicHeader onDark />

            <main className="flex-grow">

                {/* ── HERO (dark) ── */}
                <section className="relative bg-teal overflow-hidden pt-32 pb-20 lg:pt-40 lg:pb-28">
                    <div className="absolute -top-16 left-[8%] w-96 h-96 bg-coral/15 rounded-full blur-3xl animate-float pointer-events-none" />
                    <div className="absolute top-32 right-[6%] w-[26rem] h-[26rem] bg-sage/20 rounded-full blur-3xl animate-float-delayed pointer-events-none" />

                    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
                       
                        <h1 className={`text-4xl md:text-5xl lg:text-[3.6rem] font-bold tracking-tight text-white mb-6 leading-[1.08] transition-all duration-1000 delay-100 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
                            {hero.headline}
                            <br className="hidden md:block" />
                            in <span className="text-coral">{hero.headlineHighlight}</span>
                        </h1>

                        <p className={`text-base md:text-lg text-cream/75 mb-10 max-w-xl mx-auto leading-relaxed transition-all duration-1000 delay-300 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
                            {hero.subheading}
                        </p>

                        <div className={`flex flex-col sm:flex-row items-center justify-center gap-4 transition-all duration-1000 delay-500 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
                            <a href={installBtn.url} target="_blank" rel="noopener noreferrer"
                                className="group w-full sm:w-auto bg-coral hover:-translate-y-0.5 text-white px-8 py-3.5 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2 active:scale-[0.98] cursor-pointer">
                                {installBtn.label}
                                <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                            </a>
                            <a href="#how-it-works"
                                className="group w-full sm:w-auto border border-cream/30 hover:bg-white/10 text-cream px-8 py-3.5 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer">
                                <PlayCircle className="h-4 w-4" />
                                See how it works
                            </a>
                        </div>

                        <div className={`mt-8 flex items-center justify-center gap-6 text-xs text-cream/60 transition-all duration-1000 delay-700 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
                            <span className="flex items-center gap-1.5"><BadgeCheck className="h-3.5 w-3.5 text-peach" /> 14-day free trial</span>
                            <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5 text-peach" /> 2-min setup</span>
                        </div>

                        {/* Dashboard preview */}
                        <div className={`mt-14 relative transition-all duration-1000 delay-[800ms] ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-16 opacity-0'}`}>
                            <div className="absolute -inset-4 bg-coral/10 rounded-[2rem] blur-2xl pointer-events-none" />
                            <div className="relative rounded-2xl border border-white/10 overflow-hidden bg-white shadow-2xl shadow-black/30">
                                <div className="h-10 bg-cream/40 border-b border-slate-200 flex items-center px-4 gap-3">
                                    <div className="flex space-x-2">
                                        <div className="w-3 h-3 rounded-full bg-coral/70" />
                                        <div className="w-3 h-3 rounded-full bg-peach" />
                                        <div className="w-3 h-3 rounded-full bg-sage/70" />
                                    </div>
                                    <div className="flex-1 flex justify-center">
                                        <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-md px-3 py-1 max-w-sm w-full">
                                            <Lock className="h-2.5 w-2.5 text-sage shrink-0" />
                                            <span className="text-[11px] text-slate-400 truncate">docs.google.com/spreadsheets/d/thefinu-finance</span>
                                        </div>
                                    </div>
                                    <div className="w-14" />
                                </div>
                                <img
                                    src="/dashboard-preview.png"
                                    alt="ThefinU Google Sheets™ Dashboard — transactions, categories, and linked accounts"
                                    className="w-full block"
                                />
                            </div>
                        </div>
                    </div>
                </section>

                {/* ── TRUSTED BY (logos) ── */}
                <section className="py-12 bg-cream/60 overflow-hidden">
                    <p className="text-center text-sm text-slate-500 mb-6 px-4">
                        Connects with <span className="font-semibold text-teal">12,000+</span> financial institutions via Plaid
                    </p>
                    <div className="space-y-2.5">
                        {bankRows.map((row, rowIndex) => (
                            <div key={rowIndex} className="relative">
                                <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-[#F1F2E3] to-transparent z-10" />
                                <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-[#F1F2E3] to-transparent z-10" />
                                <div className={`flex gap-2.5 ${rowIndex === 0 ? 'animate-marquee' : 'animate-marquee-reverse'}`}>
                                    {[...row, ...row].map((bank, i) => (
                                        <div key={i} className="flex-shrink-0 px-3.5 py-2 bg-white rounded-lg border border-slate-200/70 text-xs font-medium text-slate-600 whitespace-nowrap flex items-center gap-1.5">
                                            <Building2 className="h-3 w-3 text-sage" />{bank}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* ── STATS ── */}
                <section className="py-16 md:py-20 bg-white" ref={statsRef}>
                    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="grid grid-cols-3 gap-y-10 reveal">
                            {[
                                { node: <AnimatedCounter end={12000} suffix="+" />, label: "Institutions supported" },
                                { node: <AnimatedCounter end={50} suffix="+" />, label: "Countries covered" },
                                { node: <AnimatedCounter end={30} suffix="+" />, label: "Hours saved / year" },
                            ].map((s, i) => (
                                <div key={i} className={`text-center px-4 ${i !== 0 ? 'md:border-l md:border-slate-200/70' : ''}`}>
                                    <div className="text-4xl md:text-5xl font-bold text-teal tracking-tight">{s.node}</div>
                                    <div className="text-xs md:text-sm text-slate-500 mt-2">{s.label}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* ── FEATURES ── */}
                <section id="features" className="py-24 bg-cream/60" ref={featuresRef}>
                    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="text-center mb-16 reveal">
                            <span className="inline-block text-[11px] font-bold uppercase tracking-[0.2em] text-coral bg-coral/10 px-3 py-1 rounded-full">Features</span>
                            <h2 className="text-3xl md:text-4xl font-bold text-teal mt-4 mb-3">{features.sectionHeading}</h2>
                            <p className="text-slate-500 max-w-md mx-auto text-sm md:text-base">{features.sectionSubheading}</p>
                        </div>

                        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
                            {features.items.map((item, i) => {
                                const Icon = FEATURE_ICONS[i % FEATURE_ICONS.length];
                                return (
                                    <div key={i} className={`reveal reveal-delay-${(i % 3) + 1} bg-white rounded-2xl border border-slate-200/60 p-7 hover:shadow-xl hover:shadow-teal/5 hover:border-coral/20 transition-all duration-300`}>
                                        <div className="w-12 h-12 rounded-xl bg-teal flex items-center justify-center mb-5">
                                            <Icon className="h-5 w-5 text-cream" />
                                        </div>
                                        <h4 className="text-base font-bold text-teal mb-2">{item.title}</h4>
                                        <p className="text-slate-500 leading-relaxed text-sm">{item.desc}</p>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </section>

                {/* ── HOW IT WORKS ── */}
                <HowItWorksSection sectionRef={howRef} steps={stepsCms} />

                {/* ── SECURITY (dark) ── */}
                <section className="py-24 bg-teal relative overflow-hidden" ref={securityRef}>
                    <div className="absolute bottom-0 right-[10%] w-80 h-80 bg-sage/15 rounded-full blur-3xl pointer-events-none" />
                    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                        <div className="text-center mb-14 reveal">
                            <span className="inline-block text-[11px] font-bold uppercase tracking-[0.2em] text-peach bg-white/10 px-3 py-1 rounded-full">Security</span>
                            <h2 className="text-3xl md:text-4xl font-bold text-white mt-4 mb-3">Private and secure</h2>
                            <p className="text-cream/70 max-w-md mx-auto text-sm">
                                ThefinU never accesses your bank credentials and never sells your data.
                            </p>
                        </div>

                        <div className="reveal">
                            <div className="grid grid-cols-3 gap-4 md:gap-6 max-w-lg mx-auto mb-12">
                                {[
                                    { icon: Lock, label: "256-bit", desc: "AES Encryption" },
                                    { icon: BadgeCheck, label: "SOC 2", desc: "Compliant" },
                                    { icon: ShieldCheck, label: "Read-only", desc: "Access Only" },
                                ].map((b, i) => (
                                    <div key={i} className="text-center p-4 md:p-5 rounded-2xl border border-white/10 bg-white/5">
                                        <div className="w-11 h-11 rounded-xl bg-white/10 flex items-center justify-center mx-auto mb-3">
                                            <b.icon className="h-5 w-5 text-peach" />
                                        </div>
                                        <div className="text-sm font-bold text-white">{b.label}</div>
                                        <div className="text-[11px] text-cream/60 mt-0.5">{b.desc}</div>
                                    </div>
                                ))}
                            </div>

                            <div className="bg-white/5 border border-white/10 rounded-3xl p-8 md:p-10 max-w-2xl mx-auto">
                                <div className="grid sm:grid-cols-2 gap-6">
                                    {[
                                        { text: "Credentials never touch our servers", icon: Lock },
                                        { text: "Data encrypted in transit and at rest", icon: ShieldCheck },
                                        { text: "Read-only — we can never move money", icon: BadgeCheck },
                                        { text: "Disconnect accounts anytime", icon: CheckCircle2 },
                                    ].map((item, i) => (
                                        <div key={i} className="flex items-start gap-3">
                                            <item.icon className="h-4 w-4 text-peach shrink-0 mt-0.5" />
                                            <span className="text-sm text-cream/90 leading-relaxed">{item.text}</span>
                                        </div>
                                    ))}
                                </div>
                                <div className="mt-8 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
                                    <p className="text-xs text-cream/60">Powered by <span className="text-white font-semibold">Plaid</span> — bank-level security infrastructure</p>
                                    <Link href="/privacy" className="text-sm text-white font-semibold hover:text-peach inline-flex items-center gap-1.5 group transition-colors">
                                        Privacy policy <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* ── PRICING ── */}
                <section id="pricing" className="py-24 bg-cream/60" ref={pricingRef}>
                    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="text-center mb-14 reveal">
                            <span className="inline-block text-[11px] font-bold uppercase tracking-[0.2em] text-coral bg-coral/10 px-3 py-1 rounded-full">Pricing</span>
                            <h2 className="text-3xl md:text-4xl font-bold text-teal mt-4 mb-3">Simple, transparent pricing</h2>
                            <p className="text-slate-500 text-sm">Choose the plan that works for you. Cancel anytime.</p>
                        </div>

                        {plans.length > 0 ? (
                            <PlanCards
                                plans={plans}
                                interval={billingInterval}
                                setInterval={setBillingInterval}
                                onSubscribe={handleSubscribe}
                                busyId={checkoutBusy}
                            />
                        ) : (
                            <p className="text-center text-sm text-slate-400">Pricing is being updated — please check back soon.</p>
                        )}
                    </div>
                </section>

                {/* ── FAQ ── */}
                <section className="py-24 bg-white" ref={faqRef}>
                    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="text-center mb-14 reveal">
                            <span className="inline-block text-[11px] font-bold uppercase tracking-[0.2em] text-coral bg-coral/10 px-3 py-1 rounded-full">FAQ</span>
                            <h2 className="text-3xl md:text-4xl font-bold text-teal mt-4 mb-3">Frequently asked questions</h2>
                            <p className="text-slate-500 text-sm">Everything you need to know.</p>
                        </div>
                        <div className="reveal">
                            {faqItems.map((item, i) => <FAQItem key={i} q={item.q} a={item.a} />)}
                        </div>
                    </div>
                </section>

                {/* ── FINAL CTA ── */}
                <section className="py-24 bg-gradient-to-br from-[#415559] via-teal to-[#293539] relative overflow-hidden">
                    <div className="absolute -top-16 right-[10%] w-80 h-80 bg-coral/20 rounded-full blur-3xl pointer-events-none" />
                    <div className="absolute -bottom-16 left-[10%] w-80 h-80 bg-sage/20 rounded-full blur-3xl pointer-events-none" />
                    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
                        <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                            {cta.heading}
                        </h2>
                        <p className="text-sm text-cream/80 mb-8 max-w-lg mx-auto">
                            {cta.subheading}
                        </p>
                        <a href={installBtn.url} target="_blank" rel="noopener noreferrer"
                            className="group inline-flex bg-coral text-white px-8 py-3.5 rounded-xl text-sm font-semibold hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200 items-center gap-2 cursor-pointer">
                            {installBtn.label} <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                        </a>
                        <div className="mt-6 flex items-center justify-center gap-6 text-xs text-cream/70">
                            <span className="flex items-center gap-1.5"><BadgeCheck className="h-3.5 w-3.5 text-peach" /> Free trial</span>
                            <span className="flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-peach" /> Secure</span>
                            <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5 text-peach" /> 2-min setup</span>
                        </div>
                    </div>
                </section>
            </main>

            <PublicFooter />
        </div>
    );
}
