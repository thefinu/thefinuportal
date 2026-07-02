"use client";

import { useState, useEffect, useCallback } from "react";
import { Save, Plus, Trash2, CheckCircle2, ChevronDown, ChevronUp } from "lucide-react";
import api from "@/lib/api";

type Tab = "home" | "about" | "contact" | "legal";
type LegalSub = "terms" | "privacy";
type HomeSection = "hero" | "install" | "features" | "steps" | "faq" | "cta";

interface HeroData { headline: string; headlineHighlight: string; subheading: string; }
interface FeaturesData {
    sectionHeading: string; sectionSubheading: string;
    items: { title: string; desc: string }[];
}
interface StepItem { title: string; desc: string; points: string[]; }
interface StepsData { sectionHeading: string; sectionSubheading: string; items: StepItem[]; }
interface FaqItem { q: string; a: string; }
interface CtaData { heading: string; subheading: string; }
interface InstallBtnData { label: string; url: string; }
interface AboutData { storyHeadline: string; subheading: string; paragraphs: string[]; }
interface ContactData { email: string; location: string; responseTime: string; }
interface TermsData { effectiveDate: string; content: string; }
interface PrivacyData { updatedDate: string; content: string; }

const DEFAULT_HERO: HeroData = {
    headline: "Automate Your Finances",
    headlineHighlight: "Google Sheets",
    subheading: "ThefinU syncs your bank transactions, balances, and investments directly into Google Sheets — track your finances with zero effort.",
};
const DEFAULT_FEATURES: FeaturesData = {
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
const DEFAULT_STEPS: StepsData = {
    sectionHeading: "Three simple steps",
    sectionSubheading: "Get started with automated finance tracking in minutes.",
    items: [
        { title: "Link your accounts", desc: "Securely connect your bank accounts, credit cards, investments, and loans through Plaid — the same infrastructure trusted by Venmo and Robinhood.", points: ["Connect with 12,000+ banks via Plaid", "Link checking, savings, cards, investments", "Get transaction history imported instantly"] },
        { title: "Get automatic updates", desc: "Your transactions, balances, and account details sync automatically per day — completely hands-free, zero manual entry.", points: ["Multiple daily updates — completely hands-free", "Transactions and balances always current", "Never manually enter data again"] },
        { title: "Make reports", desc: "Start with ready-made budget templates, then prepare the transactions sheets. Generate the reports monthly and yearly basis.", points: ["Premade templates", "Generate budgets, net worth trends, and spending breakdowns"] },
    ],
};
const DEFAULT_FAQ: FaqItem[] = [
    { q: "How does ThefinU connect to my bank?", a: "Via Plaid — the same service used by Venmo, Robinhood, and thousands of apps. Your credentials go directly to Plaid; we never see them." },
    { q: "Is my financial data secure?", a: "Yes. 256-bit encryption, read-only access only. We can never initiate transactions or move your money." },
    { q: "What banks are supported?", a: "Over 12,000 institutions across 50+ countries — Chase, BofA, Wells Fargo, Fidelity, Vanguard, and many more." },
    { q: "How often does data sync?", a: "Multiple times per day automatically. New transactions typically appear within hours of posting." },
    { q: "Can I cancel anytime?", a: "Absolutely. Cancel from settings anytime. Your spreadsheet stays yours — it's a regular Google Sheet." },
    { q: "Do I need advanced spreadsheet skills?", a: "Not at all! Templates work out of the box. Power users can customize everything." },
];
const DEFAULT_CTA: CtaData = {
    heading: "Ready to take control of your finances?",
    subheading: "Join thousands managing money smarter with ThefinU and Google Sheets.",
};
const DEFAULT_INSTALL_BTN: InstallBtnData = {
    label: "Install on Google Sheets",
    url: "https://workspace.google.com/marketplace/app/thefinu/123456789",
};
const DEFAULT_ABOUT: AboutData = {
    storyHeadline: "Welcome to ThefinU",
    subheading: "We believe everyone deserves full control over their financial data — without complexity, lock-in, or hidden fees.",
    paragraphs: [
        "With over 25 years in the financial industry, I've gained a unique perspective on both sides of the conversation.",
        "Throughout my career, I've noticed a significant shift in how partners manage their finances.",
        "My passion for analysis and love for deciphering financial trends and patterns were put to the test during a challenging period in my life: my divorce.",
        "However, I quickly discovered that existing financial tools and software were not equipped to handle this triathlon of yours, mine and ours, of financial management.",
        "I embarked on a mission to find the perfect financial software, trying every option available.",
        "Eventually, I decided to invest in software, despite its lack of apps, to simplify my financial chaos.",
        "In my professional experience, clients have consistently preferred spreadsheets over app screenshots when discussing their finances.",
        "Determined to make financial planning as efficient as ordering pizza, I sought systems that could link directly to bank accounts and provide real-time updates.",
        "So, I rolled up my sleeves and developed my own software and templates, blending existing technology into a seamless financial solution.",
    ],
};
const DEFAULT_CONTACT: ContactData = { email: "support@thefinu.com", location: "Denver Colorado", responseTime: "Within 24 hours" };
const DEFAULT_TERMS: TermsData = { effectiveDate: "October 25, 2025", content: "" };
const DEFAULT_PRIVACY: PrivacyData = { updatedDate: "September 2023", content: "" };

// ── Reusable UI ──────────────────────────────────────────────────────────────

function SaveButton({ loading, saved, onClick }: { loading: boolean; saved: boolean; onClick: () => void }) {
    return (
        <button onClick={onClick} disabled={loading}
            className="flex items-center gap-2 bg-secondary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-secondary/90 disabled:opacity-60 transition-colors cursor-pointer">
            {saved ? <CheckCircle2 className="h-4 w-4" /> : <Save className="h-4 w-4" />}
            {saved ? "Saved!" : loading ? "Saving..." : "Save"}
        </button>
    );
}

function Field({ label, value, onChange, textarea, rows, placeholder, mono }: {
    label: string; value: string; onChange: (v: string) => void;
    textarea?: boolean; rows?: number; placeholder?: string; mono?: boolean;
}) {
    const cls = `w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-secondary/30 bg-slate-50 ${mono ? "font-mono" : ""}`;
    return (
        <div>
            <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5">{label}</label>
            {textarea
                ? <textarea className={cls} rows={rows || 4} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
                : <input type="text" className={cls} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />}
        </div>
    );
}

function AccordionSection({ id, open, title, badge, onToggle, children, loading, saved, onSave }: {
    id: HomeSection; open: boolean; title: string; badge?: string;
    onToggle: () => void; children: React.ReactNode;
    loading: boolean; saved: boolean; onSave: () => void;
}) {
    return (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <button onClick={onToggle} className="w-full flex items-center justify-between px-6 py-4 text-left cursor-pointer hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-slate-800">{title}</span>
                    {badge && <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{badge}</span>}
                </div>
                {open ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
            </button>
            {open && (
                <div className="border-t border-slate-100">
                    <div className="p-6 space-y-4">{children}</div>
                    <div className="px-6 py-4 border-t border-slate-100 flex justify-end">
                        <SaveButton loading={loading} saved={saved} onClick={onSave} />
                    </div>
                </div>
            )}
        </div>
    );
}

// ── Main Component ───────────────────────────────────────────────────────────

export default function CMSPage() {
    const [tab, setTab] = useState<Tab>("home");
    const [openSection, setOpenSection] = useState<HomeSection>("hero");
    const [legalSub, setLegalSub] = useState<LegalSub>("terms");

    const [hero, setHero] = useState<HeroData>(DEFAULT_HERO);
    const [heroL, setHeroL] = useState(false); const [heroS, setHeroS] = useState(false);

    const [features, setFeatures] = useState<FeaturesData>(DEFAULT_FEATURES);
    const [featuresL, setFeaturesL] = useState(false); const [featuresS, setFeaturesS] = useState(false);

    const [steps, setSteps] = useState<StepsData>(DEFAULT_STEPS);
    const [stepsL, setStepsL] = useState(false); const [stepsS, setStepsS] = useState(false);


    const [faq, setFaq] = useState<FaqItem[]>(DEFAULT_FAQ);
    const [faqL, setFaqL] = useState(false); const [faqS, setFaqS] = useState(false);

    const [cta, setCta] = useState<CtaData>(DEFAULT_CTA);
    const [ctaL, setCtaL] = useState(false); const [ctaS, setCtaS] = useState(false);

    const [installBtn, setInstallBtn] = useState<InstallBtnData>(DEFAULT_INSTALL_BTN);
    const [installL, setInstallL] = useState(false); const [installS, setInstallS] = useState(false);

    const [about, setAbout] = useState<AboutData>(DEFAULT_ABOUT);
    const [aboutL, setAboutL] = useState(false); const [aboutS, setAboutS] = useState(false);

    const [contact, setContact] = useState<ContactData>(DEFAULT_CONTACT);
    const [contactL, setContactL] = useState(false); const [contactS, setContactS] = useState(false);

    const [terms, setTerms] = useState<TermsData>(DEFAULT_TERMS);
    const [termsL, setTermsL] = useState(false); const [termsS, setTermsS] = useState(false);

    const [privacy, setPrivacy] = useState<PrivacyData>(DEFAULT_PRIVACY);
    const [privacyL, setPrivacyL] = useState(false); const [privacyS, setPrivacyS] = useState(false);

    const load = useCallback(async (section: string, setter: (d: any) => void) => {
        try {
            const res = await api.get(`/content/${section}`);
            if (res.data.data) setter(res.data.data);
        } catch { /* keep defaults */ }
    }, []);

    useEffect(() => {
        load("home_hero", setHero);
        load("home_features", setFeatures);
        load("home_steps", setSteps);
        load("home_faq", setFaq);
        load("home_cta", setCta);
        load("home_install", setInstallBtn);
        load("about", setAbout);
        load("contact_info", setContact);
        load("terms", setTerms);
        load("privacy", setPrivacy);
    }, [load]);

    async function save(section: string, data: any, setL: (v: boolean) => void, setS: (v: boolean) => void) {
        setL(true);
        try {
            await api.post(`/content/${section}`, { data });
            setS(true);
            setTimeout(() => setS(false), 3000);
        } catch (err: any) {
            alert(err.response?.data?.message || "Failed to save content");
        } finally { setL(false); }
    }

    function toggleSection(s: HomeSection) {
        setOpenSection(prev => prev === s ? ("" as HomeSection) : s);
    }

    const tabs = [
        { id: "home" as Tab, label: "Home Page" },
        { id: "about" as Tab, label: "About Page" },
        { id: "contact" as Tab, label: "Contact Page" },
        { id: "legal" as Tab, label: "Legal Pages" },
    ];

    return (
        <div className="p-6 space-y-6 max-w-4xl">
            <div>
                <h1 className="text-xl font-bold text-slate-900">Content Management</h1>
                <p className="text-sm text-slate-500 mt-1">Edit the public-facing content of the website. Changes take effect immediately.</p>
            </div>

            {/* Tab bar */}
            <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
                {tabs.map(t => (
                    <button key={t.id} onClick={() => setTab(t.id)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${tab === t.id ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
                        {t.label}
                    </button>
                ))}
            </div>

            {/* ── HOME TAB ── */}
            {tab === "home" && (
                <div className="space-y-3">

                    {/* HERO */}
                    <AccordionSection id="hero" open={openSection === "hero"} title="Hero Section" onToggle={() => toggleSection("hero")} loading={heroL} saved={heroS} onSave={() => save("home_hero", hero, setHeroL, setHeroS)}>
                        <Field label="Headline" value={hero.headline} onChange={v => setHero(p => ({ ...p, headline: v }))} placeholder="Automate Your Finances" />
                        <Field label="Headline Highlight (colored text after 'in')" value={hero.headlineHighlight} onChange={v => setHero(p => ({ ...p, headlineHighlight: v }))} placeholder="Google Sheets" />
                        <Field label="Subheading" value={hero.subheading} onChange={v => setHero(p => ({ ...p, subheading: v }))} textarea rows={3} placeholder="ThefinU syncs your bank transactions..." />
                    </AccordionSection>

                    {/* INSTALL BUTTON */}
                    <AccordionSection id="install" open={openSection === "install"} title="Install Button" onToggle={() => toggleSection("install")} loading={installL} saved={installS} onSave={() => save("home_install", installBtn, setInstallL, setInstallS)}>
                        <p className="text-xs text-slate-400 -mt-1 mb-1">This button appears in the Hero and Final CTA sections.</p>
                        <Field label="Button Label" value={installBtn.label} onChange={v => setInstallBtn(p => ({ ...p, label: v }))} placeholder="Install on Google Sheets" />
                        <Field label="Button URL" value={installBtn.url} onChange={v => setInstallBtn(p => ({ ...p, url: v }))} placeholder="https://workspace.google.com/marketplace/..." />
                    </AccordionSection>

                    {/* FEATURES */}
                    <AccordionSection id="features" open={openSection === "features"} title="Features Section" badge="6 items" onToggle={() => toggleSection("features")} loading={featuresL} saved={featuresS} onSave={() => save("home_features", features, setFeaturesL, setFeaturesS)}>
                        <Field label="Section Heading" value={features.sectionHeading} onChange={v => setFeatures(p => ({ ...p, sectionHeading: v }))} />
                        <Field label="Section Subheading" value={features.sectionSubheading} onChange={v => setFeatures(p => ({ ...p, sectionSubheading: v }))} />
                        <div className="pt-2">
                            <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">Feature Items</label>
                            <div className="space-y-3">
                                {features.items.map((item, i) => (
                                    <div key={i} className="border border-slate-100 rounded-lg p-4 bg-slate-50/50 space-y-2.5">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Feature {i + 1}</span>
                                            <button onClick={() => setFeatures(p => ({ ...p, items: p.items.filter((_, j) => j !== i) }))}
                                                className="text-rose-400 hover:text-rose-600 transition-colors cursor-pointer">
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </button>
                                        </div>
                                        <input type="text" placeholder="Feature title" value={item.title}
                                            onChange={e => setFeatures(p => ({ ...p, items: p.items.map((x, j) => j === i ? { ...x, title: e.target.value } : x) }))}
                                            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-secondary/30 bg-white" />
                                        <textarea placeholder="Feature description" value={item.desc} rows={2}
                                            onChange={e => setFeatures(p => ({ ...p, items: p.items.map((x, j) => j === i ? { ...x, desc: e.target.value } : x) }))}
                                            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-secondary/30 bg-white" />
                                    </div>
                                ))}
                                <button onClick={() => setFeatures(p => ({ ...p, items: [...p.items, { title: "", desc: "" }] }))}
                                    className="flex items-center gap-2 text-sm text-secondary hover:text-secondary/80 font-medium cursor-pointer">
                                    <Plus className="h-4 w-4" /> Add Feature
                                </button>
                            </div>
                        </div>
                    </AccordionSection>

                    {/* STEPS */}
                    <AccordionSection id="steps" open={openSection === "steps"} title="How It Works (Steps)" badge="3 steps" onToggle={() => toggleSection("steps")} loading={stepsL} saved={stepsS} onSave={() => save("home_steps", steps, setStepsL, setStepsS)}>
                        <Field label="Section Heading" value={steps.sectionHeading} onChange={v => setSteps(p => ({ ...p, sectionHeading: v }))} />
                        <Field label="Section Subheading" value={steps.sectionSubheading} onChange={v => setSteps(p => ({ ...p, sectionSubheading: v }))} />
                        <div className="pt-2 space-y-4">
                            {steps.items.map((step, i) => (
                                <div key={i} className="border border-slate-100 rounded-lg p-4 bg-slate-50/50 space-y-3">
                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Step {i + 1}</span>
                                    <input type="text" placeholder="Step title" value={step.title}
                                        onChange={e => setSteps(p => ({ ...p, items: p.items.map((x, j) => j === i ? { ...x, title: e.target.value } : x) }))}
                                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-secondary/30 bg-white" />
                                    <textarea placeholder="Step description" value={step.desc} rows={2}
                                        onChange={e => setSteps(p => ({ ...p, items: p.items.map((x, j) => j === i ? { ...x, desc: e.target.value } : x) }))}
                                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-secondary/30 bg-white" />
                                    <div>
                                        <label className="block text-xs text-slate-400 mb-1.5">Bullet points</label>
                                        <div className="space-y-1.5">
                                            {step.points.map((pt, k) => (
                                                <div key={k} className="flex gap-2">
                                                    <input type="text" value={pt} placeholder={`Point ${k + 1}`}
                                                        onChange={e => setSteps(p => ({ ...p, items: p.items.map((x, j) => j === i ? { ...x, points: x.points.map((pp, kk) => kk === k ? e.target.value : pp) } : x) }))}
                                                        className="flex-1 border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-secondary/30 bg-white" />
                                                    <button onClick={() => setSteps(p => ({ ...p, items: p.items.map((x, j) => j === i ? { ...x, points: x.points.filter((_, kk) => kk !== k) } : x) }))}
                                                        className="text-rose-400 hover:text-rose-600 cursor-pointer"><Trash2 className="h-3.5 w-3.5" /></button>
                                                </div>
                                            ))}
                                            <button onClick={() => setSteps(p => ({ ...p, items: p.items.map((x, j) => j === i ? { ...x, points: [...x.points, ""] } : x) }))}
                                                className="flex items-center gap-1.5 text-xs text-secondary hover:text-secondary/80 font-medium cursor-pointer mt-1">
                                                <Plus className="h-3.5 w-3.5" /> Add point
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </AccordionSection>


                    {/* FAQ */}
                    <AccordionSection id="faq" open={openSection === "faq"} title="FAQ Section" badge={`${faq.length} items`} onToggle={() => toggleSection("faq")} loading={faqL} saved={faqS} onSave={() => save("home_faq", faq, setFaqL, setFaqS)}>
                        <div className="space-y-3">
                            {faq.map((item, i) => (
                                <div key={i} className="border border-slate-100 rounded-lg p-4 bg-slate-50/50 space-y-2.5">
                                    <div className="flex justify-between">
                                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Q{i + 1}</span>
                                        <button onClick={() => setFaq(prev => prev.filter((_, j) => j !== i))}
                                            className="text-rose-400 hover:text-rose-600 transition-colors cursor-pointer"><Trash2 className="h-3.5 w-3.5" /></button>
                                    </div>
                                    <input type="text" placeholder="Question" value={item.q}
                                        onChange={e => setFaq(prev => prev.map((x, j) => j === i ? { ...x, q: e.target.value } : x))}
                                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-secondary/30 bg-white" />
                                    <textarea placeholder="Answer" value={item.a} rows={2}
                                        onChange={e => setFaq(prev => prev.map((x, j) => j === i ? { ...x, a: e.target.value } : x))}
                                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-secondary/30 bg-white" />
                                </div>
                            ))}
                            <button onClick={() => setFaq(prev => [...prev, { q: "", a: "" }])}
                                className="flex items-center gap-2 text-sm text-secondary hover:text-secondary/80 font-medium cursor-pointer">
                                <Plus className="h-4 w-4" /> Add FAQ Item
                            </button>
                        </div>
                    </AccordionSection>

                    {/* CTA */}
                    <AccordionSection id="cta" open={openSection === "cta"} title="Final Call to Action" onToggle={() => toggleSection("cta")} loading={ctaL} saved={ctaS} onSave={() => save("home_cta", cta, setCtaL, setCtaS)}>
                        <Field label="Heading" value={cta.heading} onChange={v => setCta(p => ({ ...p, heading: v }))} placeholder="Ready to take control of your finances?" />
                        <Field label="Subheading" value={cta.subheading} onChange={v => setCta(p => ({ ...p, subheading: v }))} textarea rows={2} placeholder="Join thousands managing money smarter..." />
                    </AccordionSection>

                </div>
            )}

            {/* ── ABOUT TAB ── */}
            {tab === "about" && (
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-100">
                        <h3 className="text-sm font-semibold text-slate-800">About Page — Our Story</h3>
                    </div>
                    <div className="p-6 space-y-4">
                        <Field label="Story Section Headline" value={about.storyHeadline} onChange={v => setAbout(p => ({ ...p, storyHeadline: v }))} placeholder="Welcome to ThefinU" />
                        <Field label="Hero Subheading" value={about.subheading} onChange={v => setAbout(p => ({ ...p, subheading: v }))} textarea rows={2} />
                        <div>
                            <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">Story Paragraphs</label>
                            <div className="space-y-2">
                                {about.paragraphs.map((para, i) => (
                                    <div key={i} className="flex gap-2">
                                        <textarea value={para} rows={3} placeholder={`Paragraph ${i + 1}`}
                                            onChange={e => setAbout(p => ({ ...p, paragraphs: p.paragraphs.map((x, j) => j === i ? e.target.value : x) }))}
                                            className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-secondary/30 bg-slate-50" />
                                        <button onClick={() => setAbout(p => ({ ...p, paragraphs: p.paragraphs.filter((_, j) => j !== i) }))}
                                            className="text-rose-400 hover:text-rose-600 transition-colors p-1 self-start mt-1 cursor-pointer"><Trash2 className="h-4 w-4" /></button>
                                    </div>
                                ))}
                                <button onClick={() => setAbout(p => ({ ...p, paragraphs: [...p.paragraphs, ""] }))}
                                    className="flex items-center gap-2 text-sm text-secondary hover:text-secondary/80 font-medium cursor-pointer">
                                    <Plus className="h-4 w-4" /> Add Paragraph
                                </button>
                            </div>
                        </div>
                    </div>
                    <div className="px-6 py-4 border-t border-slate-100 flex justify-end">
                        <SaveButton loading={aboutL} saved={aboutS} onClick={() => save("about", about, setAboutL, setAboutS)} />
                    </div>
                </div>
            )}

            {/* ── CONTACT TAB ── */}
            {tab === "contact" && (
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-100">
                        <h3 className="text-sm font-semibold text-slate-800">Contact Information</h3>
                    </div>
                    <div className="p-6 space-y-4">
                        <Field label="Support Email" value={contact.email} onChange={v => setContact(p => ({ ...p, email: v }))} placeholder="support@thefinu.com" />
                        <Field label="Location" value={contact.location} onChange={v => setContact(p => ({ ...p, location: v }))} placeholder="Denver Colorado" />
                        <Field label="Response Time" value={contact.responseTime} onChange={v => setContact(p => ({ ...p, responseTime: v }))} placeholder="Within 24 hours" />
                    </div>
                    <div className="px-6 py-4 border-t border-slate-100 flex justify-end">
                        <SaveButton loading={contactL} saved={contactS} onClick={() => save("contact_info", contact, setContactL, setContactS)} />
                    </div>
                </div>
            )}

            {/* ── LEGAL TAB ── */}
            {tab === "legal" && (
                <div className="space-y-4">
                    <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
                        {(["terms", "privacy"] as LegalSub[]).map(s => (
                            <button key={s} onClick={() => setLegalSub(s)}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${legalSub === s ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
                                {s === "terms" ? "Terms of Service" : "Privacy Policy"}
                            </button>
                        ))}
                    </div>

                    {legalSub === "terms" && (
                        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                            <div className="px-6 py-4 border-b border-slate-100">
                                <h3 className="text-sm font-semibold text-slate-800">Terms of Service</h3>
                            </div>
                            <div className="p-6 space-y-4">
                                <Field label="Effective Date" value={terms.effectiveDate} onChange={v => setTerms(p => ({ ...p, effectiveDate: v }))} placeholder="October 25, 2025" />
                                <div>
                                    <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5">Page Content (HTML)</label>
                                    <p className="text-xs text-slate-400 mb-2">Paste the inner HTML content. Leave blank to use the default built-in content.</p>
                                    <textarea value={terms.content} rows={16} placeholder="<section><h2>1. Eligibility</h2><p>...</p></section>"
                                        onChange={e => setTerms(p => ({ ...p, content: e.target.value }))}
                                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-secondary/30 bg-slate-50 font-mono" />
                                </div>
                            </div>
                            <div className="px-6 py-4 border-t border-slate-100 flex justify-end">
                                <SaveButton loading={termsL} saved={termsS} onClick={() => save("terms", terms, setTermsL, setTermsS)} />
                            </div>
                        </div>
                    )}

                    {legalSub === "privacy" && (
                        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                            <div className="px-6 py-4 border-b border-slate-100">
                                <h3 className="text-sm font-semibold text-slate-800">Privacy Policy</h3>
                            </div>
                            <div className="p-6 space-y-4">
                                <Field label="Last Updated" value={privacy.updatedDate} onChange={v => setPrivacy(p => ({ ...p, updatedDate: v }))} placeholder="September 2023" />
                                <div>
                                    <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5">Page Content (HTML)</label>
                                    <p className="text-xs text-slate-400 mb-2">Paste the inner HTML content. Leave blank to use the default built-in content.</p>
                                    <textarea value={privacy.content} rows={16} placeholder="<section><h2>Information We Collect</h2><p>...</p></section>"
                                        onChange={e => setPrivacy(p => ({ ...p, content: e.target.value }))}
                                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-secondary/30 bg-slate-50 font-mono" />
                                </div>
                            </div>
                            <div className="px-6 py-4 border-t border-slate-100 flex justify-end">
                                <SaveButton loading={privacyL} saved={privacyS} onClick={() => save("privacy", privacy, setPrivacyL, setPrivacyS)} />
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
