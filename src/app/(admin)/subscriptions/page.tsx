"use client";

import { useState, useEffect } from "react";
import {
    Search,
    Download,
    CreditCard,
    Loader2,
    CalendarPlus,
    X,
} from "lucide-react";
import api from "@/lib/api";

interface Subscription {
    _id: string;
    userId: {
        _id: string;
        email: string;
    };
    stripeSubscriptionId: string;
    planName: string;
    amount: number;
    currency: string;
    status: string;
    currentPeriodEnd: string;
    paymentEmail: string;
    trialEnd: string | null;
}

export default function SubscriptionsPage() {
    const [searchTerm, setSearchTerm] = useState("");
    const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
    const [loading, setLoading] = useState(true);
    const [extendModal, setExtendModal] = useState<Subscription | null>(null);
    const [extendDays, setExtendDays] = useState(30);
    const [extending, setExtending] = useState(false);
    const [extendMessage, setExtendMessage] = useState("");

    const fetchSubscriptions = async () => {
        try {
            const res = await api.get("/payment/subscriptions");
            setSubscriptions(res.data);
        } catch (err) {
            console.error("Failed to fetch subscriptions", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSubscriptions();
    }, []);

    const handleExtendTrial = async () => {
        if (!extendModal) return;
        setExtending(true);
        setExtendMessage("");
        try {
            const res = await api.post("/payment/extend-trial", {
                subscriptionId: extendModal.stripeSubscriptionId,
                days: extendDays,
            });
            setExtendMessage(`Trial extended until ${new Date(res.data.trialEnd).toLocaleDateString()}`);
            await fetchSubscriptions();
            setTimeout(() => {
                setExtendModal(null);
                setExtendMessage("");
            }, 2000);
        } catch (err: any) {
            setExtendMessage(err.response?.data?.message || "Failed to extend trial");
        } finally {
            setExtending(false);
        }
    };

    const filteredSubscriptions = subscriptions.filter(sub =>
        sub.paymentEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sub.stripeSubscriptionId?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="p-8">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-slate-900">Subscriptions</h1>
                <div className="flex gap-3">
                    <button className="flex items-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">
                        <Download className="mr-2 h-4 w-4" />
                        Export
                    </button>
                </div>
            </div>

            <div className="mt-8 rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="flex items-center justify-between border-b border-slate-100 p-4">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search by email or ID..."
                            className="w-full rounded-lg border border-slate-200 pl-10 pr-4 py-2 text-sm focus:border-secondary focus:outline-none"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                {loading ? (
                    <div className="flex justify-center p-8">
                        <Loader2 className="h-8 w-8 animate-spin text-secondary" />
                    </div>
                ) : (
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
                                <th className="px-6 py-4 bg-secondary text-white">User / Email</th>
                                <th className="px-6 py-4 bg-secondary text-white">Plan</th>
                                <th className="px-6 py-4 bg-secondary text-white">Status</th>
                                <th className="px-6 py-4 bg-secondary text-white">Amount</th>
                                <th className="px-6 py-4 bg-secondary text-white">Trial End</th>
                                <th className="px-6 py-4 bg-secondary text-white">Next Billing</th>
                                <th className="px-6 py-4 bg-secondary text-white text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredSubscriptions.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-8 text-center text-slate-500">
                                        No subscriptions found
                                    </td>
                                </tr>
                            ) : (
                                filteredSubscriptions.map((sub) => (
                                    <tr key={sub._id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center">
                                                <div className="mr-3 flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                                                    <CreditCard className="h-4 w-4 text-primary" />
                                                </div>
                                                <div>
                                                    <p className="font-medium text-slate-900">{sub.paymentEmail}</p>
                                                    <p className="text-xs text-slate-500">User ID: {sub.userId?._id?.slice(0, 8)}...</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-sm font-medium text-slate-700">{sub.planName}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                                sub.status === 'active' || sub.status === 'paid'
                                                    ? 'bg-emerald-100 text-emerald-800'
                                                    : sub.status === 'trialing'
                                                        ? 'bg-blue-100 text-blue-800'
                                                        : 'bg-yellow-100 text-yellow-800'
                                            }`}>
                                                {sub.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm font-bold text-slate-900">
                                            {new Intl.NumberFormat('en-US', { style: 'currency', currency: sub.currency.toUpperCase() }).format(sub.amount)}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-500">
                                            {sub.trialEnd
                                                ? new Date(sub.trialEnd).toLocaleDateString()
                                                : <span className="text-slate-300">-</span>
                                            }
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-500">
                                            {new Date(sub.currentPeriodEnd).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => {
                                                    setExtendModal(sub);
                                                    setExtendDays(30);
                                                    setExtendMessage("");
                                                }}
                                                className="inline-flex items-center rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100 transition-colors"
                                                title="Extend Trial / Give Free Days"
                                            >
                                                <CalendarPlus className="mr-1 h-3.5 w-3.5" />
                                                Extend Trial
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Extend Trial Modal */}
            {extendModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold text-slate-900">Extend Trial</h2>
                            <button onClick={() => setExtendModal(null)} className="text-slate-400 hover:text-slate-600">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <p className="text-sm text-slate-600">Customer</p>
                                <p className="font-medium text-slate-900">{extendModal.paymentEmail}</p>
                            </div>

                            <div>
                                <p className="text-sm text-slate-600">Current Trial End</p>
                                <p className="font-medium text-slate-900">
                                    {extendModal.trialEnd
                                        ? new Date(extendModal.trialEnd).toLocaleDateString()
                                        : "No active trial"
                                    }
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Extend by (days)
                                </label>
                                <div className="flex gap-2">
                                    {[7, 14, 30, 60, 90].map((d) => (
                                        <button
                                            key={d}
                                            onClick={() => setExtendDays(d)}
                                            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                                                extendDays === d
                                                    ? "bg-secondary text-white"
                                                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                            }`}
                                        >
                                            {d}d
                                        </button>
                                    ))}
                                </div>
                                <input
                                    type="number"
                                    min={1}
                                    value={extendDays}
                                    onChange={(e) => setExtendDays(Number(e.target.value))}
                                    className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-secondary focus:outline-none"
                                    placeholder="Custom days..."
                                />
                            </div>

                            {extendMessage && (
                                <p className={`text-sm font-medium ${
                                    extendMessage.includes("Failed") ? "text-red-600" : "text-emerald-600"
                                }`}>
                                    {extendMessage}
                                </p>
                            )}

                            <div className="flex gap-3 pt-2">
                                <button
                                    onClick={() => setExtendModal(null)}
                                    className="flex-1 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleExtendTrial}
                                    disabled={extending}
                                    className="flex-1 rounded-lg bg-secondary px-4 py-2 text-sm font-medium text-white hover:bg-secondary/90 transition-colors disabled:opacity-50"
                                >
                                    {extending ? (
                                        <Loader2 className="mx-auto h-4 w-4 animate-spin" />
                                    ) : (
                                        `Extend ${extendDays} Days`
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
