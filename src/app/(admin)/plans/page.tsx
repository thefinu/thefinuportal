"use client";

import { useState, useEffect } from "react";
import {
    Tag,
    Loader2,
    Plus,
    Pencil,
    Archive,
    X,
    Star,
    CheckCircle2,
} from "lucide-react";
import api from "@/lib/api";

interface Plan {
    _id: string;
    name: string;
    description: string;
    features: string[];
    stripeProductId: string;
    monthlyPriceId: string;
    yearlyPriceId: string;
    monthlyAmount: number;
    yearlyAmount: number;
    saleMonthlyAmount: number;
    saleYearlyAmount: number;
    currency: string;
    trialDays: number;
    active: boolean;
    highlighted: boolean;
    badge: string;
    displayOrder: number;
}

interface PlanForm {
    name: string;
    description: string;
    features: string; // newline-separated in the form
    monthlyAmount: string;
    yearlyAmount: string;
    saleMonthlyAmount: string;
    saleYearlyAmount: string;
    currency: string;
    trialDays: string;
    highlighted: boolean;
    badge: string;
    displayOrder: string;
    active: boolean;
}

const EMPTY_FORM: PlanForm = {
    name: "",
    description: "",
    features: "",
    monthlyAmount: "",
    yearlyAmount: "",
    saleMonthlyAmount: "",
    saleYearlyAmount: "",
    currency: "usd",
    trialDays: "14",
    highlighted: false,
    badge: "",
    displayOrder: "0",
    active: true,
};

const money = (amount: number, currency: string) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: (currency || "usd").toUpperCase() }).format(amount);

export default function PlansPage() {
    const [plans, setPlans] = useState<Plan[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [form, setForm] = useState<PlanForm>(EMPTY_FORM);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    const fetchPlans = async () => {
        try {
            const res = await api.get("/plans");
            setPlans(res.data);
        } catch (err) {
            console.error("Failed to fetch plans", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPlans();
    }, []);

    const openCreate = () => {
        setEditingId(null);
        setForm(EMPTY_FORM);
        setError("");
        setModalOpen(true);
    };

    const openEdit = (plan: Plan) => {
        setEditingId(plan._id);
        setForm({
            name: plan.name,
            description: plan.description,
            features: (plan.features || []).join("\n"),
            monthlyAmount: plan.monthlyAmount ? String(plan.monthlyAmount) : "",
            yearlyAmount: plan.yearlyAmount ? String(plan.yearlyAmount) : "",
            saleMonthlyAmount: plan.saleMonthlyAmount ? String(plan.saleMonthlyAmount) : "",
            saleYearlyAmount: plan.saleYearlyAmount ? String(plan.saleYearlyAmount) : "",
            currency: plan.currency || "usd",
            trialDays: String(plan.trialDays ?? 14),
            highlighted: plan.highlighted,
            badge: plan.badge || "",
            displayOrder: String(plan.displayOrder ?? 0),
            active: plan.active,
        });
        setError("");
        setModalOpen(true);
    };

    const handleSave = async () => {
        setError("");

        if (!form.name.trim()) {
            setError("Plan name is required.");
            return;
        }
        const monthly = Number(form.monthlyAmount) || 0;
        const yearly = Number(form.yearlyAmount) || 0;
        if (monthly <= 0 && yearly <= 0) {
            setError("Enter at least a monthly or a yearly price.");
            return;
        }
        const saleMonthly = Number(form.saleMonthlyAmount) || 0;
        const saleYearly = Number(form.saleYearlyAmount) || 0;
        if (saleMonthly > 0 && saleMonthly >= monthly) {
            setError("The monthly sale price must be lower than the monthly price.");
            return;
        }
        if (saleYearly > 0 && saleYearly >= yearly) {
            setError("The yearly sale price must be lower than the yearly price.");
            return;
        }

        const payload = {
            name: form.name.trim(),
            description: form.description.trim(),
            features: form.features.split("\n").map((f) => f.trim()).filter(Boolean),
            monthlyAmount: monthly,
            yearlyAmount: yearly,
            saleMonthlyAmount: saleMonthly,
            saleYearlyAmount: saleYearly,
            currency: form.currency.trim().toLowerCase() || "usd",
            trialDays: Number(form.trialDays) || 0,
            highlighted: form.highlighted,
            badge: form.badge.trim(),
            displayOrder: Number(form.displayOrder) || 0,
            active: form.active,
        };

        setSaving(true);
        try {
            if (editingId) {
                await api.put(`/plans/${editingId}`, payload);
            } else {
                await api.post("/plans", payload);
            }
            await fetchPlans();
            setModalOpen(false);
        } catch (err: any) {
            setError(err.response?.data?.message || "Failed to save plan.");
        } finally {
            setSaving(false);
        }
    };

    const handleArchive = async (plan: Plan) => {
        if (!confirm(`Archive "${plan.name}"? It will be hidden from the pricing screen. Existing subscribers are unaffected.`)) {
            return;
        }
        try {
            await api.delete(`/plans/${plan._id}`);
            await fetchPlans();
        } catch (err: any) {
            alert(err.response?.data?.message || "Failed to archive plan.");
        }
    };

    return (
        <div className="p-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Plans</h1>
                    <p className="mt-1 text-sm text-slate-500">Create subscription plans — synced to Stripe and shown on the pricing page.</p>
                </div>
                <button
                    onClick={openCreate}
                    className="flex items-center rounded-lg bg-secondary px-4 py-2 text-sm font-medium text-white hover:bg-secondary/90 transition-colors"
                >
                    <Plus className="mr-2 h-4 w-4" />
                    Create Plan
                </button>
            </div>

            <div className="mt-8 rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                {loading ? (
                    <div className="flex justify-center p-8">
                        <Loader2 className="h-8 w-8 animate-spin text-secondary" />
                    </div>
                ) : plans.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-12 text-center">
                        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                            <Tag className="h-6 w-6 text-slate-400" />
                        </div>
                        <p className="text-slate-600 font-medium">No plans yet</p>
                        <p className="text-sm text-slate-400 mt-1">Create your first plan to display it on the pricing screen.</p>
                    </div>
                ) : (
                    <table className="w-full text-left">
                        <thead>
                            <tr className="text-xs font-semibold uppercase tracking-wider">
                                <th className="px-6 py-4 bg-secondary text-white">Plan</th>
                                <th className="px-6 py-4 bg-secondary text-white">Monthly</th>
                                <th className="px-6 py-4 bg-secondary text-white">Yearly</th>
                                <th className="px-6 py-4 bg-secondary text-white">Trial</th>
                                <th className="px-6 py-4 bg-secondary text-white">Status</th>
                                <th className="px-6 py-4 bg-secondary text-white text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {plans.map((plan) => (
                                <tr key={plan._id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <p className="font-medium text-slate-900">{plan.name}</p>
                                            {plan.highlighted && (
                                                <Star className="h-4 w-4 text-amber-400 fill-amber-400" />
                                            )}
                                        </div>
                                        {plan.description && (
                                            <p className="text-xs text-slate-500 mt-0.5 max-w-xs truncate">{plan.description}</p>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-700">
                                        {plan.monthlyAmount > 0 ? (
                                            plan.saleMonthlyAmount > 0 && plan.saleMonthlyAmount < plan.monthlyAmount ? (
                                                <span>
                                                    <span className="text-slate-400 line-through mr-1.5">{money(plan.monthlyAmount, plan.currency)}</span>
                                                    <span className="font-semibold text-rose-600">{money(plan.saleMonthlyAmount, plan.currency)}</span>/mo
                                                </span>
                                            ) : `${money(plan.monthlyAmount, plan.currency)}/mo`
                                        ) : <span className="text-slate-300">—</span>}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-700">
                                        {plan.yearlyAmount > 0 ? (
                                            plan.saleYearlyAmount > 0 && plan.saleYearlyAmount < plan.yearlyAmount ? (
                                                <span>
                                                    <span className="text-slate-400 line-through mr-1.5">{money(plan.yearlyAmount, plan.currency)}</span>
                                                    <span className="font-semibold text-rose-600">{money(plan.saleYearlyAmount, plan.currency)}</span>/yr
                                                </span>
                                            ) : `${money(plan.yearlyAmount, plan.currency)}/yr`
                                        ) : <span className="text-slate-300">—</span>}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-500">{plan.trialDays > 0 ? `${plan.trialDays}d` : "—"}</td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                            plan.active ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-500"
                                        }`}>
                                            {plan.active ? "Active" : "Archived"}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <button
                                                onClick={() => openEdit(plan)}
                                                className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                                            >
                                                <Pencil className="mr-1 h-3.5 w-3.5" />
                                                Edit
                                            </button>
                                            {plan.active && (
                                                <button
                                                    onClick={() => handleArchive(plan)}
                                                    className="inline-flex items-center rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-100 transition-colors"
                                                >
                                                    <Archive className="mr-1 h-3.5 w-3.5" />
                                                    Archive
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Create / Edit Modal */}
            {modalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="w-full max-w-2xl rounded-xl bg-white shadow-xl max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between border-b border-slate-100 p-6 sticky top-0 bg-white">
                            <h2 className="text-lg font-semibold text-slate-900">{editingId ? "Edit Plan" : "Create Plan"}</h2>
                            <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="p-6 space-y-5">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Plan Name</label>
                                <input
                                    type="text"
                                    value={form.name}
                                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                                    placeholder="Pro"
                                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-secondary focus:outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                                <input
                                    type="text"
                                    value={form.description}
                                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                                    placeholder="Everything you need to automate your finances"
                                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-secondary focus:outline-none"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Monthly Price</label>
                                    <input
                                        type="number"
                                        min={0}
                                        step="0.01"
                                        value={form.monthlyAmount}
                                        onChange={(e) => setForm({ ...form, monthlyAmount: e.target.value })}
                                        placeholder="2.99"
                                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-secondary focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Yearly Price</label>
                                    <input
                                        type="number"
                                        min={0}
                                        step="0.01"
                                        value={form.yearlyAmount}
                                        onChange={(e) => setForm({ ...form, yearlyAmount: e.target.value })}
                                        placeholder="29"
                                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-secondary focus:outline-none"
                                    />
                                </div>
                            </div>
                            <p className="-mt-2 text-xs text-slate-400">Leave a price at 0 to not offer that billing interval. Prices can't be edited on Stripe — changing an amount creates a new Stripe price automatically.</p>

                            <div className="rounded-lg border border-dashed border-slate-200 p-4">
                                <p className="text-sm font-semibold text-slate-700 mb-0.5">Sale price (optional)</p>
                                <p className="text-xs text-slate-400 mb-3">Set a discounted price to put this plan on sale. The regular price shows struck through and checkout charges the sale price. Leave at 0 for no sale.</p>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Monthly Sale Price</label>
                                        <input
                                            type="number"
                                            min={0}
                                            step="0.01"
                                            value={form.saleMonthlyAmount}
                                            onChange={(e) => setForm({ ...form, saleMonthlyAmount: e.target.value })}
                                            placeholder="1.99"
                                            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-secondary focus:outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Yearly Sale Price</label>
                                        <input
                                            type="number"
                                            min={0}
                                            step="0.01"
                                            value={form.saleYearlyAmount}
                                            onChange={(e) => setForm({ ...form, saleYearlyAmount: e.target.value })}
                                            placeholder="19"
                                            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-secondary focus:outline-none"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Currency</label>
                                    <input
                                        type="text"
                                        value={form.currency}
                                        onChange={(e) => setForm({ ...form, currency: e.target.value })}
                                        placeholder="usd"
                                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-secondary focus:outline-none uppercase"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Trial Days</label>
                                    <input
                                        type="number"
                                        min={0}
                                        value={form.trialDays}
                                        onChange={(e) => setForm({ ...form, trialDays: e.target.value })}
                                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-secondary focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Display Order</label>
                                    <input
                                        type="number"
                                        value={form.displayOrder}
                                        onChange={(e) => setForm({ ...form, displayOrder: e.target.value })}
                                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-secondary focus:outline-none"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Badge (optional)</label>
                                <input
                                    type="text"
                                    value={form.badge}
                                    onChange={(e) => setForm({ ...form, badge: e.target.value })}
                                    placeholder="Most Popular"
                                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-secondary focus:outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Features (one per line)</label>
                                <textarea
                                    rows={5}
                                    value={form.features}
                                    onChange={(e) => setForm({ ...form, features: e.target.value })}
                                    placeholder={"Unlimited bank connections\nMultiple daily auto-syncs\nPriority support"}
                                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-secondary focus:outline-none resize-y"
                                />
                            </div>

                            <div className="flex items-center gap-6">
                                <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={form.highlighted}
                                        onChange={(e) => setForm({ ...form, highlighted: e.target.checked })}
                                        className="h-4 w-4 rounded border-slate-300 text-secondary focus:ring-secondary"
                                    />
                                    Highlight as featured
                                </label>
                                <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={form.active}
                                        onChange={(e) => setForm({ ...form, active: e.target.checked })}
                                        className="h-4 w-4 rounded border-slate-300 text-secondary focus:ring-secondary"
                                    />
                                    Active (visible on pricing)
                                </label>
                            </div>

                            {error && (
                                <div className="rounded-lg bg-rose-50 border border-rose-100 p-3 text-sm text-rose-600">
                                    {error}
                                </div>
                            )}
                        </div>

                        <div className="flex gap-3 border-t border-slate-100 p-6 sticky bottom-0 bg-white">
                            <button
                                onClick={() => setModalOpen(false)}
                                className="flex-1 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="flex-1 rounded-lg bg-secondary px-4 py-2 text-sm font-medium text-white hover:bg-secondary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {saving ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <>
                                        <CheckCircle2 className="h-4 w-4" />
                                        {editingId ? "Save Changes" : "Create Plan"}
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
