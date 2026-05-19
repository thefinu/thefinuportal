"use client";

import Link from "next/link";
import PublicHeader from "@/components/PublicHeader";
import PublicFooter from "@/components/PublicFooter";
import {
    ArrowRight,
    ShieldCheck,
    Zap,
    Heart,
    Target,
    Eye,
    Lightbulb,
    Lock,
    CheckCircle2,
    Landmark,
    Globe,
    Users,
    Clock,
    BadgeCheck,
    FileSpreadsheet,
    TrendingUp,
    Sparkles
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

const INSTALL_LINK = "https://workspace.google.com/marketplace/app/thefinu/123456789";

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

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

const DEFAULT_ABOUT = {
    storyHeadline: "Welcome to ThefinU",
    subheading: "We believe everyone deserves full control over their financial data — without complexity, lock-in, or hidden fees.",
    paragraphs: [
        "With over 25 years in the financial industry, I've gained a unique perspective on both sides of the conversation. I've witnessed the relentless pursuit of perfect financial data from advisors and the quest for financial clarity from clients. My extensive experience allows me to understand how to assist DIY clients to manage their finances effectively. This dual insight has been instrumental in developing a self-driven approach to budget and financial planning.",
        "Throughout my career, I've noticed a significant shift in how partners manage their finances. Today, partners often view their finances both together and independently, much like sharing a streaming subscription—sometimes enjoyed together, sometimes separately. This modern approach intrigued me, prompting me to delve deeper into mastering joint AND individual financial planning. By understanding the nuances of this dual approach, I've been able to help partners navigate their own financial journeys more effectively, ensuring they can plan for both shared and individual goals.",
        "My passion for analysis and love for deciphering financial trends and patterns were put to the test during a challenging period in my life: my divorce. Managing our finances together had been second nature, but separating them was like untangling last year's Christmas lights—tedious and frustrating. This experience intensified my interest in DIY financial planning, as I had to rethink my approach to managing finances, ensuring that I could handle them independently while still planning for future partnerships.",
        "However, I quickly discovered that existing financial tools and software were not equipped to handle this triathlon of yours, mine and ours, of financial management. No available solutions offered the flexibility to manage individual and joint finances seamlessly. This gap in the market became a personal challenge for me, as I sought a way to bridge this divide and create a more holistic financial management tool.",
        "I embarked on a mission to find the perfect financial software, trying every option available. Unfortunately, none of them met my needs without making me feel like a data-entry intern, requiring extensive manual input and customization. The process became so cumbersome that it started deterring me from regularly assessing my financial situation. It was clear that I needed a more efficient solution, one that could streamline the management of my finances without adding to my workload.",
        "Eventually, I decided to invest in software, despite its lack of apps, to simplify my financial chaos. This decision was driven by the realization that I needed a solution that could stop my spreadsheets from looking like a financial crime scene. By investing in more advanced software, I aimed to make financial management less burdensome and more intuitive, ensuring that I could keep track of my finances without the hassle of manual data entry.",
        "In my professional experience, clients have consistently preferred spreadsheets over app screenshots when discussing their finances. This preference stems from the deeper customization and control that spreadsheets offer. DIY financial planners, in particular, appreciate the ability to analyze and present their data in specific ways, free from the limitations and potential privacy concerns of third-party apps. They want their financial data raw and unprocessed, allowing them to draw their own conclusions and make informed decisions.",
        "Determined to make financial planning as efficient as ordering pizza, I sought systems that could link directly to bank accounts and provide real-time updates on pending transactions. My goal was to create a tool that offered both a partnership and individual view of finances, helping users understand their contributions or hindrances to financial goals. By integrating real-time data and providing a clear financial overview, I aimed to empower users to make proactive financial decisions.",
        "So, I rolled up my sleeves and developed my own software and templates, blending existing technology into a seamless financial solution. My aim was to make financial management as effortless as binge-watching your favorite show, but with more productive results. Now, DIY financial planners can manage their finances and make informed decisions without needing a financial PhD. This solution not only simplifies the process but also ensures that users retain control and ownership of their financial data, making financial planning more accessible and efficient.",
    ],
};

export default function AboutPage() {
    const [isVisible, setIsVisible] = useState(false);
    const [aboutCms, setAboutCms] = useState(DEFAULT_ABOUT);

    useEffect(() => {
        setIsVisible(true);
        fetch(`${API_URL}/content/about`).then(r => r.json()).then(({ data }) => { if (data) setAboutCms(data); }).catch(() => {});
    }, []);

    const storyRef = useReveal();
    const valuesRef = useReveal();
    const statsRef = useReveal();
    const whyRef = useReveal();

    return (
        <div className="flex flex-col min-h-screen bg-white text-slate-900 font-sans selection:bg-primary/10">
            <PublicHeader />

            <main className="flex-grow">

                {/* ── HERO ── */}
                <section className="relative pt-28 pb-16 lg:pt-40 lg:pb-24 overflow-hidden hero-gradient">
                    <div className="absolute inset-0 dot-pattern" />
                    <div className="absolute top-20 left-[8%] w-80 h-80 bg-primary/[0.03] rounded-full blur-3xl animate-float" />
                    <div className="absolute bottom-10 right-[5%] w-[28rem] h-[28rem] bg-secondary/[0.02] rounded-full blur-3xl animate-float-delayed" />

                    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
                        <div className={`inline-flex items-center gap-2 bg-white/80 backdrop-blur-sm border border-primary/10 rounded-full px-4 py-1.5 mb-7 shadow-sm transition-all duration-700 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'}`}>
                            <Heart className="h-3.5 w-3.5 text-primary" />
                            <span className="text-xs font-semibold text-slate-600">Our Story</span>
                        </div>

                        <h1 className={`text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-slate-950 mb-5 leading-[1.1] transition-all duration-1000 delay-100 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
                            Making Personal Finance
                            <br className="hidden md:block" />
                            <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">Simple & Accessible</span>
                        </h1>

                        <p className={`text-sm md:text-base font-medium text-slate-500 mb-8 max-w-xl mx-auto leading-relaxed transition-all duration-1000 delay-300 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
                            {aboutCms.subheading}
                        </p>
                    </div>
                </section>

                <div className="h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />

                {/* ── OUR STORY ── */}
                <section className="py-14 bg-white" ref={storyRef}>
                    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="grid md:grid-cols-1 items-center">
                            <div className="reveal">
                                <h2 className="text-xl md:text-xl font-bold text-slate-950 mb-4">{aboutCms.storyHeadline}</h2>
                                <div className="space-y-4 text-sm text-slate-600 leading-relaxed">
                                    {aboutCms.paragraphs.map((para, i) => <p key={i}>{para}</p>)}
                                </div>
                                <div className="mt-6">
                                    <Link href="https://www.linkedin.com/in/thefinu/" target="_blank" className="inline-flex items-center gap-1 text-primary font-medium hover:underline bg-primary/10 px-3 py-1 rounded-full transition-colors duration-200">
                                        About Me
                                        <ArrowRight className="h-4 w-4" />
                                    </Link>
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
