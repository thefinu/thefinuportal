"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowRight, CheckCircle, Loader2, CreditCard, Sparkles } from "lucide-react";
import Link from "next/link";
import api from "@/lib/api";
import PublicHeader from "@/components/PublicHeader";
import PublicFooter from "@/components/PublicFooter";

function SuccessContent() {
    const searchParams = useSearchParams();
    const sessionId = searchParams.get("session_id");
    const spreadsheetId = searchParams.get("spreadsheet_id");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [details, setDetails] = useState<any>(null);

    useEffect(() => {
        const verifyPayment = async () => {
            if (!sessionId) {
                setLoading(false);
                return;
            }

            try {
                const res = await api.post("/payment/verify-session", { sessionId });
                setDetails(res.data.data);
            } catch (err: any) {
                console.error("Payment verification failed", err);
                setError("Could not verify payment details. Please contact support.");
            } finally {
                setLoading(false);
            }
        };

        verifyPayment();
    }, [sessionId]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh]">
                <Loader2 className="h-10 w-10 animate-spin text-secondary mb-4" />
                <p className="text-slate-500 font-sans text-sm">Verifying your transformation...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="max-w-md mx-auto text-center py-20">
                <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-50 border border-rose-100">
                    <AlertCircle className="h-8 w-8 text-rose-500" />
                </div>
                <h1 className="mb-2 text-2xl font-bold text-slate-900">Something went wrong</h1>
                <p className="mb-8 text-slate-500 text-sm">{error}</p>
                <Link
                    href="/"
                    className="inline-flex items-center justify-center rounded-xl bg-primary px-6 py-3 text-sm font-bold text-white hover:opacity-90 transition-all"
                >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Safety
                </Link>
            </div>
        );
    }

    const spreadsheetUrl = spreadsheetId
        ? `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`
        : "/";

    return (
        <div className="w-full max-w-xl mx-auto py-12 px-4">
            <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden p-8 sm:p-12 text-center relative group">
                <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-emerald-100 via-secondary to-emerald-100" />

                <div className="mx-auto mb-8 flex h-20 w-20 items-center justify-center rounded-[1.5rem] bg-emerald-50 text-secondary relative">
                    <Sparkles className="h-10 w-10 animate-pulse" />
                    <div className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-white border-4 border-white flex items-center justify-center">
                        <CheckCircle className="h-4 w-4 text-emerald-500" />
                    </div>
                </div>

                <h1 className="mb-3 text-3xl font-bold tracking-tight text-slate-950">
                    You're All Set!
                </h1>

                <p className="mb-8 text-slate-500 text-sm leading-relaxed">
                    Great news! Your Pro features are now unlocked and ready to use in your Google Sheet™.
                </p>

                {details && (
                    <div className="mb-8 rounded-2xl bg-slate-50 p-6 text-left border border-slate-200/50 space-y-4">
                        <div className="flex items-center text-slate-900 mb-2">
                            <div className="p-1.5 bg-white rounded-lg shadow-sm border border-slate-100 mr-3">
                                <CreditCard className="h-4 w-4 text-slate-400" />
                            </div>
                            <span className="font-bold text-sm tracking-tight uppercase text-slate-400">Order Summary</span>
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-sm font-sans">
                            <div>
                                <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Plan</p>
                                <p className="font-bold text-slate-800">{details.plan || "Pro Annual"}</p>
                            </div>
                            <div>
                                <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Amount</p>
                                <p className="font-bold text-slate-800">
                                    {new Intl.NumberFormat('en-US', { style: 'currency', currency: details.currency || 'USD' }).format(details.amount)}
                                </p>
                            </div>
                            <div className="col-span-2 pt-2 border-t border-slate-200/50">
                                <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Account</p>
                                <p className="font-bold text-slate-800 truncate">{details.email}</p>
                            </div>
                        </div>
                    </div>
                )}

                <div className="grid gap-4">
                    <a
                        href={spreadsheetUrl}
                        className="flex w-full items-center justify-center rounded-xl bg-primary px-6 py-4 text-center text-base font-bold text-white shadow-xl shadow-primary/10 transition-all hover:-translate-y-0.5"
                    >
                        Open Google Sheet™ <ArrowRight className="ml-2 h-4 w-4" />
                    </a>
                </div>
            </div>
        </div>
    );
}

const AlertCircle = ({ className }: { className: string }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
);

export default function SuccessPage() {
    return (
        <div className="min-h-screen bg-white font-sans flex flex-col">
            <PublicHeader />
            <main className="flex-grow flex items-center justify-center pt-24 pb-12">
                <Suspense fallback={<div className="text-slate-400 animate-pulse text-sm">Getting things ready...</div>}>
                    <SuccessContent />
                </Suspense>
            </main>
            <PublicFooter />
        </div>
    );
}
