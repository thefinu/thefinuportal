"use client";

import { AlertCircle, ArrowLeft, HelpCircle, Ban } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import PublicHeader from "@/components/PublicHeader";
import PublicFooter from "@/components/PublicFooter";

function CancelContent() {
    return (
        <div className="w-full max-w-xl mx-auto py-12 px-4">
            <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden p-8 sm:p-12 text-center relative">
                <div className="absolute top-0 inset-x-0 h-1 bg-slate-200" />

                <div className="mx-auto mb-8 flex h-20 w-20 items-center justify-center rounded-[1.5rem] bg-slate-50 text-slate-400 relative">
                    <Ban className="h-10 w-10" />
                </div>

                <h1 className="mb-3 text-3xl font-bold tracking-tight text-slate-950">
                    Order Cancelled
                </h1>

                <p className="mb-10 text-slate-500 text-sm leading-relaxed">
                    The payment process was not completed and you haven't been charged. If you ran into any issues, our support team is happy to help.
                </p>

                <div className="grid grid-cols-1 gap-4">
                    <Link
                        href="/"
                        className="flex w-full items-center justify-center rounded-xl bg-slate-900 px-6 py-4 text-center text-base font-bold text-white shadow-xl shadow-slate-100 transition-all hover:-translate-y-0.5"
                    >
                        <ArrowLeft className="mr-2 h-4 w-4" /> Return to Home
                    </Link>

                    <a
                        href="mailto:support@thefinu.com"
                        className="flex w-full items-center justify-center rounded-xl bg-white border border-slate-200 px-6 py-4 text-center text-base font-bold text-slate-700 hover:bg-slate-50 transition-all"
                    >
                        <HelpCircle className="mr-2 h-4 w-4" />
                        Contact Support
                    </a>
                </div>
            </div>
        </div>
    );
}

export default function CancelPage() {
    return (
        <div className="min-h-screen bg-white font-sans flex flex-col">
            <PublicHeader />
            <main className="flex-grow flex items-center justify-center pt-24 pb-12">
                <Suspense fallback={<div className="text-slate-400 animate-pulse text-sm">Loading...</div>}>
                    <CancelContent />
                </Suspense>
            </main>
            <PublicFooter />
        </div>
    );
}
