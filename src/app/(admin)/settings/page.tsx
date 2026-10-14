"use client";

import { useState, useEffect } from "react";
import { Save, Loader2, Info, Key, Globe, Mail, FileText, CreditCard, Plus, Pencil, Trash2, X, Check, FlaskConical, AlertTriangle } from "lucide-react";
import api from "@/lib/api";

interface PlaidPricing {
    _id: string;
    product: string;
    rate: number;
    perCall: boolean;
    perMonth: boolean;
}

const emptyPricing = { product: "", rate: "", perCall: false, perMonth: false };

export default function SettingsPage() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState({ type: "", content: "" });
    const [settings, setSettings] = useState({
        plaidClientKey: "",
        plaidSecretKey: "",
        plaidEnvironment: "sandbox",
        plaidWebhookUrl: "",
        spreadsheetTemplateUrl: "",
        pickerApiKey: "",
        appInstruction: "",
        notificationEmail: "",
        appEmail: "",
        stripePublicKey: "",
        stripeSecretKey: "",
        stripeWebhookSecret: "",
        stripePaymentMode: "sandbox",
        smtpHost: "smtp.gmail.com",
        smtpPort: "587",
        smtpUser: "",
        smtpPass: "",
        contactEmail: "",

        // Development Environment. When devEnabled is on, any user whose email is in
        // devUsers is served these TEST credentials instead of the live ones above —
        // see backend utils/envCredentials.ts. Everyone else is unaffected.
        devEnabled: false,
        devUsers: [] as string[],
        devPlaidClientKey: "",
        devPlaidSecretKey: "",
        devPlaidEnvironment: "sandbox",
        devPlaidWebhookUrl: "",
        devStripePublicKey: "",
        devStripeSecretKey: "",
        devStripeWebhookSecret: "",
    });

    // Draft text for the "add developer" box. Kept out of `settings` so an unconfirmed
    // entry is never posted.
    const [devUserDraft, setDevUserDraft] = useState("");
    const [devUserError, setDevUserError] = useState("");

    // Plaid Pricing state
    const [pricing, setPricing] = useState<PlaidPricing[]>([]);
    const [pricingLoading, setPricingLoading] = useState(true);
    const [pricingMessage, setPricingMessage] = useState({ type: "", content: "" });
    const [editingPricing, setEditingPricing] = useState<PlaidPricing | null>(null);
    const [addingPricing, setAddingPricing] = useState(false);
    const [pricingForm, setPricingForm] = useState<{ product: string; rate: string; perCall: boolean; perMonth: boolean }>(emptyPricing);
    const [savingPricing, setSavingPricing] = useState(false);
    const [deletingPricingId, setDeletingPricingId] = useState<string | null>(null);

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const res = await api.get("/settings");
                if (res.data) {
                    // Merged onto the defaults rather than replacing them: a settings
                    // document saved before a field existed omits it entirely, and a
                    // missing devUsers would leave the list undefined and break render.
                    setSettings(prev => ({
                        ...prev,
                        ...res.data,
                        devUsers: Array.isArray(res.data.devUsers) ? res.data.devUsers : [],
                    }));
                }
            } catch (err) {
                console.error("Failed to fetch settings", err);
            } finally {
                setLoading(false);
            }
        };
        fetchSettings();
        fetchPricing();
    }, []);

    const fetchPricing = async () => {
        setPricingLoading(true);
        try {
            const res = await api.get("/plaid/pricing");
            setPricing(res.data);
        } catch (err) {
            console.error("Failed to fetch pricing", err);
        } finally {
            setPricingLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setMessage({ type: "", content: "" });
        try {
            await api.post("/settings", settings);
            setMessage({ type: "success", content: "Settings saved successfully!" });
        } catch (err) {
            setMessage({ type: "error", content: "Failed to save settings. Please try again." });
        } finally {
            setSaving(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setSettings(prev => ({ ...prev, [name]: value }));
    };

    const handleToggle = (name: string, checked: boolean) => {
        setSettings(prev => ({ ...prev, [name]: checked }));
    };

    const addDevUser = () => {
        const email = devUserDraft.trim().toLowerCase();
        if (!email) return;
        // Deliberately permissive — just enough to catch a typo before it silently
        // fails to match any real account.
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            setDevUserError("That does not look like an email address.");
            return;
        }
        // The backend compares trimmed and lowercased on both sides, so a duplicate
        // differing only in case would be dead weight in the list.
        if (settings.devUsers.some(e => (e || "").trim().toLowerCase() === email)) {
            setDevUserError("That email is already on the list.");
            return;
        }
        setSettings(prev => ({ ...prev, devUsers: [...prev.devUsers, email] }));
        setDevUserDraft("");
        setDevUserError("");
    };

    const removeDevUser = (email: string) => {
        setSettings(prev => ({ ...prev, devUsers: prev.devUsers.filter(e => e !== email) }));
    };

    const openAddPricing = () => {
        setEditingPricing(null);
        setPricingForm(emptyPricing);
        setAddingPricing(true);
        setPricingMessage({ type: "", content: "" });
    };

    const openEditPricing = (item: PlaidPricing) => {
        setEditingPricing(item);
        setPricingForm({ product: item.product, rate: String(item.rate), perCall: item.perCall, perMonth: item.perMonth });
        setAddingPricing(true);
        setPricingMessage({ type: "", content: "" });
    };

    const cancelPricingForm = () => {
        setAddingPricing(false);
        setEditingPricing(null);
        setPricingForm(emptyPricing);
    };

    const handleSavePricing = async () => {
        if (!pricingForm.product || pricingForm.rate === "") {
            setPricingMessage({ type: "error", content: "Product and rate are required." });
            return;
        }
        setSavingPricing(true);
        setPricingMessage({ type: "", content: "" });
        try {
            const payload = {
                product: pricingForm.product,
                rate: parseFloat(pricingForm.rate),
                perCall: pricingForm.perCall,
                perMonth: pricingForm.perMonth,
            };
            if (editingPricing) {
                await api.put(`/plaid/pricing/${editingPricing._id}`, payload);
            } else {
                await api.post("/plaid/pricing", payload);
            }
            await fetchPricing();
            cancelPricingForm();
        } catch (err: any) {
            console.error("[pricing save] error:", err.response ?? err);
            const status = err.response?.status;
            const msg    = err.response?.data?.message || err.message || "Failed to save pricing.";
            setPricingMessage({ type: "error", content: status ? `[${status}] ${msg}` : msg });
        } finally {
            setSavingPricing(false);
        }
    };

    const handleDeletePricing = async (id: string) => {
        setDeletingPricingId(id);
        try {
            await api.delete(`/plaid/pricing/${id}`);
            await fetchPricing();
        } catch (err) {
            console.error("Failed to delete pricing", err);
        } finally {
            setDeletingPricingId(null);
        }
    };

    if (loading) {
        return (
            <div className="flex h-full items-center justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-secondary" />
            </div>
        );
    }

    return (
        <div className="p-8 max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Application Settings</h1>
                    <p className="text-slate-500">Configure your financial portal and integrations.</p>
                </div>
            </div>

            {message.content && (
                <div className={`mb-6 p-4 rounded-lg flex items-center ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-rose-50 text-rose-700 border border-rose-100'}`}>
                    <Info className="mr-2 h-5 w-5" />
                    {message.content}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Plaid Configuration */}
                <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="mb-4 flex items-center border-b border-slate-100 pb-4">
                        <Key className="mr-2 h-5 w-5 text-secondary" />
                        <h2 className="text-lg font-bold text-slate-900">Plaid Integration</h2>
                    </div>
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Plaid Client Key</label>
                            <input
                                type="text"
                                name="plaidClientKey"
                                value={settings.plaidClientKey}
                                onChange={handleChange}
                                className="w-full rounded-lg border border-slate-200 px-4 py-2 text-sm focus:border-secondary focus:outline-none"
                                placeholder="Enter client key"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Plaid Secret Key</label>
                            <input
                                type="password"
                                name="plaidSecretKey"
                                value={settings.plaidSecretKey}
                                onChange={handleChange}
                                className="w-full rounded-lg border border-slate-200 px-4 py-2 text-sm focus:border-secondary focus:outline-none"
                                placeholder="Enter secret key"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Plaid Environment</label>
                            <select
                                name="plaidEnvironment"
                                value={settings.plaidEnvironment}
                                onChange={handleChange}
                                className="w-full rounded-lg border border-slate-200 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none bg-white"
                            >
                                <option value="sandbox">Sandbox</option>
                                <option value="production">Production</option>
                            </select>
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-slate-700 mb-1">Plaid Webhook URL</label>
                            <input
                                type="url"
                                name="plaidWebhookUrl"
                                value={settings.plaidWebhookUrl || ""}
                                onChange={handleChange}
                                className="w-full rounded-lg border border-slate-200 px-4 py-2 text-sm focus:border-secondary focus:outline-none"
                                placeholder="https://your-domain.com/api/accounts/plaid-webhook"
                            />
                            <p className="mt-1 text-xs text-slate-500 flex items-center">
                                <Info className="mr-1 h-3 w-3" />
                                This URL will receive SYNC_UPDATES_AVAILABLE notifications from Plaid.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Stripe Configuration */}
                <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="mb-4 flex items-center border-b border-slate-100 pb-4">
                        <CreditCard className="mr-2 h-5 w-5 text-secondary" />
                        <h2 className="text-lg font-bold text-slate-900">Stripe Integration</h2>
                    </div>
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Stripe Public Key</label>
                            <input
                                type="text"
                                name="stripePublicKey"
                                value={settings.stripePublicKey}
                                onChange={handleChange}
                                className="w-full rounded-lg border border-slate-200 px-4 py-2 text-sm focus:border-secondary focus:outline-none"
                                placeholder="pk_test_..."
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Stripe Secret Key</label>
                            <input
                                type="password"
                                name="stripeSecretKey"
                                value={settings.stripeSecretKey}
                                onChange={handleChange}
                                className="w-full rounded-lg border border-slate-200 px-4 py-2 text-sm focus:border-secondary focus:outline-none"
                                placeholder="sk_test_..."
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Stripe Webhook Secret</label>
                            <input
                                type="password"
                                name="stripeWebhookSecret"
                                value={settings.stripeWebhookSecret}
                                onChange={handleChange}
                                className="w-full rounded-lg border border-slate-200 px-4 py-2 text-sm focus:border-secondary focus:outline-none"
                                placeholder="whsec_..."
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Payment Mode</label>
                            <select
                                name="stripePaymentMode"
                                value={settings.stripePaymentMode}
                                onChange={handleChange}
                                className="w-full rounded-lg border border-slate-200 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none bg-white"
                            >
                                <option value="sandbox">Sandbox</option>
                                <option value="production">Production</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Development Environment — test credentials for allowlisted users */}
                <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-4">
                        <div className="flex items-center">
                            <FlaskConical className="mr-2 h-5 w-5 text-secondary" />
                            <h2 className="text-lg font-bold text-slate-900">Development Environment</h2>
                        </div>
                        <label className="flex cursor-pointer items-center gap-2">
                            <span className="text-sm font-medium text-slate-700">
                                {settings.devEnabled ? "Enabled" : "Disabled"}
                            </span>
                            <input
                                type="checkbox"
                                name="devEnabled"
                                checked={!!settings.devEnabled}
                                onChange={(e) => handleToggle("devEnabled", e.target.checked)}
                                className="h-4 w-4 rounded border-slate-300 text-secondary focus:ring-secondary"
                            />
                        </label>
                    </div>

                    <p className="mb-5 text-sm text-slate-500">
                        Users on this list are served the test Plaid and Stripe credentials below, so they
                        can exercise the real add-on against sandbox data. Everyone else continues to use
                        the live credentials. Nothing applies unless this section is enabled.
                    </p>

                    {/* Allowlist */}
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-slate-700 mb-1">Allowlisted Emails</label>
                        <div className="flex gap-2">
                            <input
                                type="email"
                                value={devUserDraft}
                                onChange={(e) => { setDevUserDraft(e.target.value); setDevUserError(""); }}
                                // Enter inside a form submits it, which would save the settings
                                // before the typed email had been added to the list.
                                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addDevUser(); } }}
                                className="w-full rounded-lg border border-slate-200 px-4 py-2 text-sm focus:border-secondary focus:outline-none"
                                placeholder="developer@example.com"
                            />
                            <button
                                type="button"
                                onClick={addDevUser}
                                className="flex shrink-0 items-center rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 transition-all"
                            >
                                <Plus className="mr-1 h-4 w-4" />
                                Add
                            </button>
                        </div>
                        {devUserError && (
                            <p className="mt-1 text-xs text-rose-600">{devUserError}</p>
                        )}

                        {settings.devUsers.length > 0 ? (
                            <div className="mt-3 flex flex-wrap gap-2">
                                {settings.devUsers.map((email) => (
                                    <span
                                        key={email}
                                        className="flex items-center rounded-full bg-slate-100 py-1 pl-3 pr-1 text-sm text-slate-700"
                                    >
                                        {email}
                                        <button
                                            type="button"
                                            onClick={() => removeDevUser(email)}
                                            aria-label={`Remove ${email}`}
                                            className="ml-1 rounded-full p-1 text-slate-400 hover:bg-slate-200 hover:text-rose-600 transition-all"
                                        >
                                            <X className="h-3.5 w-3.5" />
                                        </button>
                                    </span>
                                ))}
                            </div>
                        ) : (
                            <p className="mt-3 text-sm text-slate-400">No developers on the list.</p>
                        )}
                    </div>

                    {settings.devEnabled && settings.devUsers.length === 0 && (
                        <div className="mb-6 flex items-start rounded-lg border border-amber-100 bg-amber-50 p-3 text-sm text-amber-700">
                            <AlertTriangle className="mr-2 mt-0.5 h-4 w-4 shrink-0" />
                            The Development Environment is enabled but no emails are listed, so every user
                            is still served the live credentials.
                        </div>
                    )}

                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Test Plaid Client Key</label>
                            <input
                                type="text"
                                name="devPlaidClientKey"
                                value={settings.devPlaidClientKey}
                                onChange={handleChange}
                                className="w-full rounded-lg border border-slate-200 px-4 py-2 text-sm focus:border-secondary focus:outline-none"
                                placeholder="Plaid sandbox client ID"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Test Plaid Secret Key</label>
                            <input
                                type="password"
                                name="devPlaidSecretKey"
                                value={settings.devPlaidSecretKey}
                                onChange={handleChange}
                                className="w-full rounded-lg border border-slate-200 px-4 py-2 text-sm focus:border-secondary focus:outline-none"
                                placeholder="Plaid sandbox secret"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Test Plaid Environment</label>
                            <select
                                name="devPlaidEnvironment"
                                value={settings.devPlaidEnvironment}
                                onChange={handleChange}
                                className="w-full rounded-lg border border-slate-200 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none bg-white"
                            >
                                <option value="sandbox">Sandbox</option>
                                <option value="production">Production</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Test Plaid Webhook URL</label>
                            <input
                                type="text"
                                name="devPlaidWebhookUrl"
                                value={settings.devPlaidWebhookUrl}
                                onChange={handleChange}
                                className="w-full rounded-lg border border-slate-200 px-4 py-2 text-sm focus:border-secondary focus:outline-none"
                                placeholder="https://..."
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Test Stripe Public Key</label>
                            <input
                                type="text"
                                name="devStripePublicKey"
                                value={settings.devStripePublicKey}
                                onChange={handleChange}
                                className="w-full rounded-lg border border-slate-200 px-4 py-2 text-sm focus:border-secondary focus:outline-none"
                                placeholder="pk_test_..."
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Test Stripe Secret Key</label>
                            <input
                                type="password"
                                name="devStripeSecretKey"
                                value={settings.devStripeSecretKey}
                                onChange={handleChange}
                                className="w-full rounded-lg border border-slate-200 px-4 py-2 text-sm focus:border-secondary focus:outline-none"
                                placeholder="sk_test_..."
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Test Stripe Webhook Secret</label>
                            <input
                                type="password"
                                name="devStripeWebhookSecret"
                                value={settings.devStripeWebhookSecret}
                                onChange={handleChange}
                                className="w-full rounded-lg border border-slate-200 px-4 py-2 text-sm focus:border-secondary focus:outline-none"
                                placeholder="whsec_..."
                            />
                        </div>
                    </div>
                </div>

                {/* Spreadsheet & App Config */}
                <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="mb-4 flex items-center border-b border-slate-100 pb-4">
                        <Globe className="mr-2 h-5 w-5 text-secondary" />
                        <h2 className="text-lg font-bold text-slate-900">External Connections</h2>
                    </div>
                    <div className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Spreadsheet Template URL</label>
                            <div className="relative">
                                <FileText className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="url"
                                    name="spreadsheetTemplateUrl"
                                    value={settings.spreadsheetTemplateUrl}
                                    onChange={handleChange}
                                    className="w-full rounded-lg border border-slate-200 pl-10 pr-4 py-2 text-sm focus:border-secondary focus:outline-none"
                                    placeholder="https://docs.google.com/spreadsheets/..."
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Google Picker API Key</label>
                            <div className="relative">
                                <Key className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="password"
                                    name="pickerApiKey"
                                    value={(settings as any).pickerApiKey || ""}
                                    onChange={handleChange}
                                    className="w-full rounded-lg border border-slate-200 pl-10 pr-4 py-2 text-sm focus:border-secondary focus:outline-none"
                                    placeholder="AIza..."
                                />
                            </div>
                            <p className="mt-1 text-xs text-slate-500 flex items-center">
                                <Info className="mr-1 h-3 w-3" />
                                Google Cloud API key with the Picker API enabled. Used by the add-on setup wizard for template installation.
                            </p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">App Instruction (Markdown or Plain Text)</label>
                            <textarea
                                name="appInstruction"
                                value={settings.appInstruction}
                                onChange={handleChange}
                                rows={4}
                                className="w-full rounded-lg border border-slate-200 px-4 py-2 text-sm focus:border-secondary focus:outline-none"
                                placeholder="Enter instructions for the app users..."
                            />
                        </div>
                    </div>
                </div>

                {/* Email Configuration */}
                <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="mb-4 flex items-center border-b border-slate-100 pb-4">
                        <Mail className="mr-2 h-5 w-5 text-secondary" />
                        <h2 className="text-lg font-bold text-slate-900">Email Configuration</h2>
                    </div>
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">SMTP Host</label>
                            <input
                                type="text"
                                name="smtpHost"
                                value={settings.smtpHost}
                                onChange={handleChange}
                                className="w-full rounded-lg border border-slate-200 px-4 py-2 text-sm focus:border-secondary focus:outline-none"
                                placeholder="smtp.gmail.com"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">SMTP Port</label>
                            <input
                                type="number"
                                name="smtpPort"
                                value={settings.smtpPort}
                                onChange={handleChange}
                                className="w-full rounded-lg border border-slate-200 px-4 py-2 text-sm focus:border-secondary focus:outline-none"
                                placeholder="587"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">SMTP User (Email)</label>
                            <input
                                type="email"
                                name="smtpUser"
                                value={settings.smtpUser}
                                onChange={handleChange}
                                className="w-full rounded-lg border border-slate-200 px-4 py-2 text-sm focus:border-secondary focus:outline-none"
                                placeholder="anna@thefinu.com"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">SMTP Password (App Password)</label>
                            <input
                                type="password"
                                name="smtpPass"
                                value={settings.smtpPass}
                                onChange={handleChange}
                                className="w-full rounded-lg border border-slate-200 px-4 py-2 text-sm focus:border-secondary focus:outline-none"
                                placeholder="Enter app password"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Contact Form Recipient Email</label>
                            <input
                                type="email"
                                name="contactEmail"
                                value={settings.contactEmail}
                                onChange={handleChange}
                                className="w-full rounded-lg border border-slate-200 px-4 py-2 text-sm focus:border-secondary focus:outline-none"
                                placeholder="anna@thefinu.com"
                            />
                            <p className="mt-1 text-xs text-slate-500 flex items-center">
                                <Info className="mr-1 h-3 w-3" />
                                Emails from Contact and Feature Request forms will be sent here.
                            </p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Notification Email Address</label>
                            <input
                                type="email"
                                name="notificationEmail"
                                value={settings.notificationEmail}
                                onChange={handleChange}
                                className="w-full rounded-lg border border-slate-200 px-4 py-2 text-sm focus:border-secondary focus:outline-none"
                                placeholder="alerts@example.com"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">App Email Address</label>
                            <input
                                type="email"
                                name="appEmail"
                                value={settings.appEmail}
                                onChange={handleChange}
                                className="w-full rounded-lg border border-slate-200 px-4 py-2 text-sm focus:border-secondary focus:outline-none"
                                placeholder="system@example.com"
                            />
                        </div>
                    </div>
                </div>

                <div className="flex justify-end pt-4">
                    <button
                        type="submit"
                        disabled={saving}
                        className="flex items-center rounded-lg bg-primary px-8 py-3 text-sm font-bold text-white hover:opacity-90 transition-all disabled:opacity-50 shadow-md"
                    >
                        {saving ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Saving...
                            </>
                        ) : (
                            <>
                                <Save className="mr-2 h-4 w-4" />
                                Save All Settings
                            </>
                        )}
                    </button>
                </div>
            </form>

            {/* Plaid Pricing Model — separate from main settings form */}
            <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-4">
                    <div className="flex items-center">
                        <Key className="mr-2 h-5 w-5 text-secondary" />
                        <h2 className="text-lg font-bold text-slate-900">Plaid Pricing Model</h2>
                    </div>
                    {!addingPricing && (
                        <button
                            onClick={openAddPricing}
                            className="inline-flex items-center rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-white hover:opacity-90 transition-all"
                        >
                            <Plus className="mr-1 h-4 w-4" />
                            Add Product
                        </button>
                    )}
                </div>

                {pricingMessage.content && (
                    <div className={`mb-4 p-3 rounded-lg text-sm flex items-center ${pricingMessage.type === 'error' ? 'bg-rose-50 text-rose-700 border border-rose-100' : 'bg-emerald-50 text-emerald-700 border border-emerald-100'}`}>
                        <Info className="mr-2 h-4 w-4" />
                        {pricingMessage.content}
                    </div>
                )}

                {/* Add / Edit form */}
                {addingPricing && (
                    <div className="mb-5 rounded-lg border border-slate-200 bg-slate-50 p-4">
                        <h3 className="text-sm font-semibold text-slate-700 mb-3">
                            {editingPricing ? "Edit Product" : "New Product"}
                        </h3>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <div>
                                <label className="block text-xs font-medium text-slate-600 mb-1">Product Name</label>
                                <input
                                    type="text"
                                    value={pricingForm.product}
                                    onChange={(e) => setPricingForm(f => ({ ...f, product: e.target.value }))}
                                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-secondary focus:outline-none bg-white"
                                    placeholder="e.g. Transactions, Investments"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-600 mb-1">Rate (USD)</label>
                                <input
                                    type="number"
                                    value={pricingForm.rate}
                                    onChange={(e) => setPricingForm(f => ({ ...f, rate: e.target.value }))}
                                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-secondary focus:outline-none bg-white"
                                    placeholder="0.00"
                                    step="0.01"
                                    min="0"
                                />
                            </div>
                            <div className="flex items-center gap-6">
                                <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-700">
                                    <input
                                        type="checkbox"
                                        checked={pricingForm.perCall}
                                        onChange={(e) => setPricingForm(f => ({ ...f, perCall: e.target.checked }))}
                                        className="h-4 w-4 rounded border-slate-300 accent-secondary"
                                    />
                                    Per Call
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-700">
                                    <input
                                        type="checkbox"
                                        checked={pricingForm.perMonth}
                                        onChange={(e) => setPricingForm(f => ({ ...f, perMonth: e.target.checked }))}
                                        className="h-4 w-4 rounded border-slate-300 accent-secondary"
                                    />
                                    Per Month
                                </label>
                            </div>
                        </div>
                        <div className="mt-4 flex gap-2 justify-end">
                            <button
                                onClick={cancelPricingForm}
                                className="inline-flex items-center rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors"
                            >
                                <X className="mr-1 h-4 w-4" />
                                Cancel
                            </button>
                            <button
                                onClick={handleSavePricing}
                                disabled={savingPricing}
                                className="inline-flex items-center rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-white hover:opacity-90 transition-all disabled:opacity-50"
                            >
                                {savingPricing ? (
                                    <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                                ) : (
                                    <Check className="mr-1 h-4 w-4" />
                                )}
                                {editingPricing ? "Update" : "Save"}
                            </button>
                        </div>
                    </div>
                )}

                {pricingLoading ? (
                    <div className="flex justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-secondary" />
                    </div>
                ) : pricing.length === 0 ? (
                    <p className="py-6 text-center text-sm text-slate-500">No pricing models configured yet.</p>
                ) : (
                    <table className="w-full text-left text-sm">
                        <thead>
                            <tr>
                                <th className="px-4 py-3 bg-secondary text-white font-semibold rounded-tl-lg">Product</th>
                                <th className="px-4 py-3 bg-secondary text-white font-semibold text-right">Rate (USD)</th>
                                <th className="px-4 py-3 bg-secondary text-white font-semibold text-center">Per Call</th>
                                <th className="px-4 py-3 bg-secondary text-white font-semibold text-center">Per Month</th>
                                <th className="px-4 py-3 bg-secondary text-white font-semibold text-right rounded-tr-lg">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {pricing.map((item) => (
                                <tr key={item._id} className="hover:bg-slate-50">
                                    <td className="px-4 py-3 font-medium text-slate-800">{item.product}</td>
                                    <td className="px-4 py-3 text-right font-mono text-slate-700">${item.rate.toFixed(2)}</td>
                                    <td className="px-4 py-3 text-center">
                                        {item.perCall ? (
                                            <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-700">Yes</span>
                                        ) : (
                                            <span className="text-slate-300">—</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        {item.perMonth ? (
                                            <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-700">Yes</span>
                                        ) : (
                                            <span className="text-slate-300">—</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <button
                                                onClick={() => openEditPricing(item)}
                                                className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                                            >
                                                <Pencil className="mr-1 h-3 w-3" />
                                                Edit
                                            </button>
                                            <button
                                                onClick={() => handleDeletePricing(item._id)}
                                                disabled={deletingPricingId === item._id}
                                                className="inline-flex items-center rounded-lg border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-100 transition-colors disabled:opacity-50"
                                            >
                                                {deletingPricingId === item._id ? (
                                                    <Loader2 className="h-3 w-3 animate-spin" />
                                                ) : (
                                                    <Trash2 className="mr-1 h-3 w-3" />
                                                )}
                                                Delete
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
