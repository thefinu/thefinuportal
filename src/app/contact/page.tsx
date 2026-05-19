"use client";

import PublicHeader from "@/components/PublicHeader";
import PublicFooter from "@/components/PublicFooter";
import { Mail, Lightbulb, Send, CheckCircle2, AlertCircle, MapPin, Clock, ArrowRight } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import api from "@/lib/api";

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

interface FormStatus {
    type: "idle" | "loading" | "success" | "error";
    message: string;
}

const FEATURE_OPTIONS = [
    { value: "", label: "Select a feature" },
    { value: "plan_wanted_faster", label: "Plan Wanted Faster" },
    { value: "templates", label: "Templates" },
    { value: "aggregation", label: "Aggregation" },
    { value: "other", label: "Other" },
];

function validateEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export default function ContactPage() {
    const [isVisible, setIsVisible] = useState(false);
    const [contactInfo, setContactInfo] = useState({
        email: "support@thefinu.com",
        location: "Denver, Colorado",
        responseTime: "Within 24 hours",
    });

    useEffect(() => {
        setIsVisible(true);
        fetch(`${API_URL}/content/contact_info`).then(r => r.json()).then(({ data }) => { if (data) setContactInfo(data); }).catch(() => {});
    }, []);

    const formsRef = useReveal();
    const infoRef = useReveal();
    const [activeTab, setActiveTab] = useState<"feature" | "contact">("contact");

    // ── Feature Request Form State ──
    const [featureForm, setFeatureForm] = useState({
        firstName: "",
        email: "",
        feature: "",
        details: "",
    });
    const [featureErrors, setFeatureErrors] = useState<Record<string, string>>({});
    const [featureStatus, setFeatureStatus] = useState<FormStatus>({ type: "idle", message: "" });

    // ── Contact Form State ──
    const [contactForm, setContactForm] = useState({
        firstName: "",
        lastName: "",
        email: "",
        message: "",
    });
    const [contactErrors, setContactErrors] = useState<Record<string, string>>({});
    const [contactStatus, setContactStatus] = useState<FormStatus>({ type: "idle", message: "" });

    function validateFeatureForm(): boolean {
        const errors: Record<string, string> = {};
        if (!featureForm.firstName.trim()) errors.firstName = "First name is required";
        if (!featureForm.email.trim()) errors.email = "Email is required";
        else if (!validateEmail(featureForm.email)) errors.email = "Please enter a valid email address";
        if (!featureForm.feature) errors.feature = "Please select a feature";
        if (!featureForm.details.trim()) errors.details = "Please provide some details";
        setFeatureErrors(errors);
        return Object.keys(errors).length === 0;
    }

    function validateContactForm(): boolean {
        const errors: Record<string, string> = {};
        if (!contactForm.firstName.trim()) errors.firstName = "First name is required";
        if (!contactForm.lastName.trim()) errors.lastName = "Last name is required";
        if (!contactForm.email.trim()) errors.email = "Email is required";
        else if (!validateEmail(contactForm.email)) errors.email = "Please enter a valid email address";
        if (!contactForm.message.trim()) errors.message = "Message is required";
        setContactErrors(errors);
        return Object.keys(errors).length === 0;
    }

    async function handleFeatureSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!validateFeatureForm()) return;
        setFeatureStatus({ type: "loading", message: "" });
        try {
            await api.post("/contact/feature-request", {
                firstName: featureForm.firstName.trim(),
                email: featureForm.email.trim(),
                feature: featureForm.feature,
                details: featureForm.details.trim(),
            });
            setFeatureStatus({ type: "success", message: "Feature request submitted successfully!" });
            setFeatureForm({ firstName: "", email: "", feature: "", details: "" });
            setFeatureErrors({});
        } catch {
            setFeatureStatus({ type: "error", message: "Something went wrong. Please try again." });
        }
    }

    async function handleContactSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!validateContactForm()) return;
        setContactStatus({ type: "loading", message: "" });
        try {
            await api.post("/contact", {
                firstName: contactForm.firstName.trim(),
                lastName: contactForm.lastName.trim(),
                email: contactForm.email.trim(),
                message: contactForm.message.trim(),
            });
            setContactStatus({ type: "success", message: "Message sent successfully!" });
            setContactForm({ firstName: "", lastName: "", email: "", message: "" });
            setContactErrors({});
        } catch {
            setContactStatus({ type: "error", message: "Something went wrong. Please try again." });
        }
    }

    function handleFeatureChange(field: string, value: string) {
        setFeatureForm(prev => ({ ...prev, [field]: value }));
        if (featureErrors[field]) setFeatureErrors(prev => { const next = { ...prev }; delete next[field]; return next; });
        if (featureStatus.type !== "idle") setFeatureStatus({ type: "idle", message: "" });
    }

    function handleContactChange(field: string, value: string) {
        setContactForm(prev => ({ ...prev, [field]: value }));
        if (contactErrors[field]) setContactErrors(prev => { const next = { ...prev }; delete next[field]; return next; });
        if (contactStatus.type !== "idle") setContactStatus({ type: "idle", message: "" });
    }

    const inputBase = "w-full px-4 py-3 rounded-lg border text-sm transition-all duration-200 outline-none bg-slate-50/50 placeholder:text-slate-300";
    const inputClasses = (hasError: boolean) =>
        `${inputBase} ${hasError
            ? "border-red-200 focus:border-red-400 focus:ring-2 focus:ring-red-50 bg-red-50/30"
            : "border-slate-200/80 focus:border-primary/40 focus:ring-2 focus:ring-primary/5 focus:bg-white"
        }`;

    return (
        <div className="flex flex-col min-h-screen bg-white text-slate-900 font-sans selection:bg-primary/10">
            <PublicHeader />

            <main className="flex-grow">

                {/* ── HERO ── */}
                <section className="relative pt-32 pb-6 lg:pt-44 lg:pb-10 overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-b from-slate-50 to-white" />
                    <div className="absolute top-20 left-[15%] w-64 h-64 bg-primary/[0.02] rounded-full blur-3xl" />
                    <div className="absolute top-10 right-[10%] w-80 h-80 bg-secondary/[0.02] rounded-full blur-3xl" />

                    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
                        <h1 className={`text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight text-slate-950 mb-4 leading-[1.15] transition-all duration-1000 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
                            Get in Touch
                        </h1>
                        <p className={`text-sm md:text-base text-slate-400 max-w-md mx-auto leading-relaxed transition-all duration-1000 delay-200 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
                            Have a feature idea or a question? We&apos;d love to hear from you.
                        </p>
                    </div>
                </section>

                {/* ── MAIN CONTENT ── */}
                <section className="pb-20 pt-6" ref={formsRef}>
                    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="grid lg:grid-cols-5 gap-10 lg:gap-14">

                            {/* ── LEFT: CONTACT INFO ── */}
                            <div className="lg:col-span-2 reveal" ref={infoRef}>
                                <div className="lg:sticky lg:top-32">
                                    <div className="mb-8">
                                        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">Reach Out</span>
                                        <h2 className="text-xl font-bold text-slate-950 mt-2 mb-3">Let&apos;s start a conversation</h2>
                                        <p className="text-sm text-slate-400 leading-relaxed">
                                            Whether you want to request a new feature or just have a question, fill out the form and we&apos;ll respond within 24 hours.
                                        </p>
                                    </div>

                                    <div className="space-y-5">
                                        {[
                                            {
                                                icon: Mail,
                                                label: "Email us",
                                                value: contactInfo.email,
                                                href: `mailto:${contactInfo.email}`,
                                                iconBg: "bg-primary/5",
                                                iconColor: "text-primary"
                                            },
                                            {
                                                icon: MapPin,
                                                label: "Location",
                                                value: contactInfo.location,
                                                iconBg: "bg-blue-50",
                                                iconColor: "text-blue-500"
                                            },
                                            {
                                                icon: Clock,
                                                label: "Response time",
                                                value: contactInfo.responseTime,
                                                iconBg: "bg-emerald-50",
                                                iconColor: "text-emerald-500"
                                            },
                                        ].map((item, i) => (
                                            <div key={i} className="flex items-start gap-3.5 group">
                                                <div className={`w-9 h-9 rounded-lg ${item.iconBg} flex items-center justify-center shrink-0 mt-0.5`}>
                                                    <item.icon className={`h-4 w-4 ${item.iconColor}`} />
                                                </div>
                                                <div>
                                                    <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-300 mb-0.5">{item.label}</p>
                                                    {item.href ? (
                                                        <a href={item.href} className="text-sm font-medium text-slate-700 hover:text-primary transition-colors">
                                                            {item.value}
                                                        </a>
                                                    ) : (
                                                        <p className="text-sm font-medium text-slate-700">{item.value}</p>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Decorative divider */}
                                    <div className="hidden lg:block mt-10 pt-8 border-t border-slate-100">
                                        <p className="text-xs text-slate-300 leading-relaxed">
                                            Your data is secure. We never share your information with third parties.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* ── RIGHT: FORMS ── */}
                            <div className="lg:col-span-3 reveal reveal-delay-1">
                                {/* Tab Switcher */}
                                <div className="flex bg-slate-100/80 rounded-xl p-1 mb-8">
                                    <button
                                        onClick={() => setActiveTab("feature")}
                                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all duration-300 ${activeTab === "feature"
                                            ? "bg-primary text-white shadow-sm shadow-primary/25"
                                            : "text-slate-400 hover:text-slate-600 cursor-pointer"
                                            }`}
                                    >
                                        <Lightbulb className="h-4 w-4" />
                                        Request a Feature
                                    </button>
                                    <button
                                        onClick={() => setActiveTab("contact")}
                                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all duration-300 ${activeTab === "contact"
                                            ? "bg-primary text-white shadow-sm shadow-primary/25"
                                            : "text-slate-400 hover:text-slate-600 cursor-pointer"
                                            }`}
                                    >
                                        <Mail className="h-4 w-4" />
                                        Contact
                                    </button>
                                </div>

                                {/* ── FEATURE REQUEST FORM ── */}
                                <div className={activeTab === "feature" ? "block" : "hidden"}>
                                    {featureStatus.type === "success" ? (
                                        <div className="flex flex-col items-center justify-center text-center py-16 bg-slate-50/50 rounded-2xl border border-slate-100">
                                            <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mb-5">
                                                <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                                            </div>
                                            <h3 className="text-lg font-bold text-slate-900 mb-1">Request Submitted</h3>
                                            <p className="text-sm text-slate-400 mb-6 max-w-xs">{featureStatus.message}</p>
                                            <button
                                                onClick={() => setFeatureStatus({ type: "idle", message: "" })}
                                                className="inline-flex items-center gap-1.5 text-sm text-primary font-semibold hover:underline"
                                            >
                                                Submit another request <ArrowRight className="h-3.5 w-3.5" />
                                            </button>
                                        </div>
                                    ) : (
                                        <form onSubmit={handleFeatureSubmit} className="space-y-5" noValidate>
                                            <div>
                                                <label htmlFor="feature-firstName" className="block text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wider">
                                                    First Name
                                                </label>
                                                <input
                                                    id="feature-firstName"
                                                    type="text"
                                                    placeholder="John"
                                                    value={featureForm.firstName}
                                                    onChange={e => handleFeatureChange("firstName", e.target.value)}
                                                    className={inputClasses(!!featureErrors.firstName)}
                                                />
                                                {featureErrors.firstName && (
                                                    <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
                                                        <AlertCircle className="h-3 w-3 shrink-0" />{featureErrors.firstName}
                                                    </p>
                                                )}
                                            </div>

                                            <div>
                                                <label htmlFor="feature-email" className="block text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wider">
                                                    Email
                                                </label>
                                                <input
                                                    id="feature-email"
                                                    type="email"
                                                    placeholder="john@example.com"
                                                    value={featureForm.email}
                                                    onChange={e => handleFeatureChange("email", e.target.value)}
                                                    className={inputClasses(!!featureErrors.email)}
                                                />
                                                {featureErrors.email && (
                                                    <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
                                                        <AlertCircle className="h-3 w-3 shrink-0" />{featureErrors.email}
                                                    </p>
                                                )}
                                            </div>

                                            <div>
                                                <label htmlFor="feature-select" className="block text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wider">
                                                    Select a Feature
                                                </label>
                                                <select
                                                    id="feature-select"
                                                    value={featureForm.feature}
                                                    onChange={e => handleFeatureChange("feature", e.target.value)}
                                                    className={`${inputClasses(!!featureErrors.feature)} ${!featureForm.feature ? "text-slate-400" : "text-slate-900"}`}
                                                >
                                                    {FEATURE_OPTIONS.map(opt => (
                                                        <option key={opt.value} value={opt.value} disabled={opt.value === ""} className="text-slate-900 bg-white py-2">
                                                            {opt.label}
                                                        </option>
                                                    ))}
                                                </select>
                                                {featureErrors.feature && (
                                                    <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
                                                        <AlertCircle className="h-3 w-3 shrink-0" />{featureErrors.feature}
                                                    </p>
                                                )}
                                            </div>

                                            <div>
                                                <label htmlFor="feature-details" className="block text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wider">
                                                    Give us more details
                                                </label>
                                                <textarea
                                                    id="feature-details"
                                                    rows={5}
                                                    placeholder="Describe the feature you'd like to see..."
                                                    value={featureForm.details}
                                                    onChange={e => handleFeatureChange("details", e.target.value)}
                                                    className={`${inputClasses(!!featureErrors.details)} resize-none`}
                                                />
                                                {featureErrors.details && (
                                                    <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
                                                        <AlertCircle className="h-3 w-3 shrink-0" />{featureErrors.details}
                                                    </p>
                                                )}
                                            </div>

                                            {featureStatus.type === "error" && (
                                                <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-4 py-3 flex items-center gap-2">
                                                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />{featureStatus.message}
                                                </div>
                                            )}

                                            <button
                                                type="submit"
                                                disabled={featureStatus.type === "loading"}
                                                className="w-full bg-slate-900 hover:bg-slate-800 text-white px-6 py-3.5 rounded-lg text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98] cursor-pointer"
                                            >
                                                {featureStatus.type === "loading" ? (
                                                    <>
                                                        <span className="h-4 w-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                                        Submitting...
                                                    </>
                                                ) : (
                                                    <>Submit Request <Send className="h-3.5 w-3.5" /></>
                                                )}
                                            </button>
                                        </form>
                                    )}
                                </div>

                                {/* ── CONTACT FORM ── */}
                                <div className={activeTab === "contact" ? "block" : "hidden"}>
                                    {contactStatus.type === "success" ? (
                                        <div className="flex flex-col items-center justify-center text-center py-16 bg-slate-50/50 rounded-2xl border border-slate-100">
                                            <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mb-5">
                                                <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                                            </div>
                                            <h3 className="text-lg font-bold text-slate-900 mb-1">Message Sent</h3>
                                            <p className="text-sm text-slate-400 mb-6 max-w-xs">{contactStatus.message}</p>
                                            <button
                                                onClick={() => setContactStatus({ type: "idle", message: "" })}
                                                className="inline-flex items-center gap-1.5 text-sm text-primary font-semibold hover:underline"
                                            >
                                                Send another message <ArrowRight className="h-3.5 w-3.5" />
                                            </button>
                                        </div>
                                    ) : (
                                        <form onSubmit={handleContactSubmit} className="space-y-5" noValidate>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                                <div>
                                                    <label htmlFor="contact-firstName" className="block text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wider">
                                                        First Name
                                                    </label>
                                                    <input
                                                        id="contact-firstName"
                                                        type="text"
                                                        placeholder="John"
                                                        value={contactForm.firstName}
                                                        onChange={e => handleContactChange("firstName", e.target.value)}
                                                        className={inputClasses(!!contactErrors.firstName)}
                                                    />
                                                    {contactErrors.firstName && (
                                                        <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
                                                            <AlertCircle className="h-3 w-3 shrink-0" />{contactErrors.firstName}
                                                        </p>
                                                    )}
                                                </div>
                                                <div>
                                                    <label htmlFor="contact-lastName" className="block text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wider">
                                                        Last Name
                                                    </label>
                                                    <input
                                                        id="contact-lastName"
                                                        type="text"
                                                        placeholder="Doe"
                                                        value={contactForm.lastName}
                                                        onChange={e => handleContactChange("lastName", e.target.value)}
                                                        className={inputClasses(!!contactErrors.lastName)}
                                                    />
                                                    {contactErrors.lastName && (
                                                        <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
                                                            <AlertCircle className="h-3 w-3 shrink-0" />{contactErrors.lastName}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>

                                            <div>
                                                <label htmlFor="contact-email" className="block text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wider">
                                                    Email
                                                </label>
                                                <input
                                                    id="contact-email"
                                                    type="email"
                                                    placeholder="john@example.com"
                                                    value={contactForm.email}
                                                    onChange={e => handleContactChange("email", e.target.value)}
                                                    className={inputClasses(!!contactErrors.email)}
                                                />
                                                {contactErrors.email && (
                                                    <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
                                                        <AlertCircle className="h-3 w-3 shrink-0" />{contactErrors.email}
                                                    </p>
                                                )}
                                            </div>

                                            <div>
                                                <label htmlFor="contact-message" className="block text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wider">
                                                    Message
                                                </label>
                                                <textarea
                                                    id="contact-message"
                                                    rows={6}
                                                    placeholder="How can we help you?"
                                                    value={contactForm.message}
                                                    onChange={e => handleContactChange("message", e.target.value)}
                                                    className={`${inputClasses(!!contactErrors.message)} resize-none`}
                                                />
                                                {contactErrors.message && (
                                                    <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
                                                        <AlertCircle className="h-3 w-3 shrink-0" />{contactErrors.message}
                                                    </p>
                                                )}
                                            </div>

                                            {contactStatus.type === "error" && (
                                                <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-4 py-3 flex items-center gap-2">
                                                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />{contactStatus.message}
                                                </div>
                                            )}

                                            <button
                                                type="submit"
                                                disabled={contactStatus.type === "loading"}
                                                className="w-full bg-slate-900 hover:bg-slate-800 text-white px-6 py-3.5 rounded-lg text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98] cursor-pointer"
                                            >
                                                {contactStatus.type === "loading" ? (
                                                    <>
                                                        <span className="h-4 w-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                                        Sending...
                                                    </>
                                                ) : (
                                                    <>Send Message <Send className="h-3.5 w-3.5" /></>
                                                )}
                                            </button>
                                        </form>
                                    )}
                                </div>

                            </div>
                        </div>
                    </div>
                </section>

            </main>

            <PublicFooter />
        </div>
    );
}
