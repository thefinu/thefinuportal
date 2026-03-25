"use client";

import { useState, useEffect } from "react";
import { Save, Loader2, Info, Key, Globe, Mail, FileText, CreditCard } from "lucide-react";
import api from "@/lib/api";

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
    });

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const res = await api.get("/settings");
                if (res.data) {
                    setSettings(res.data);
                }
            } catch (err) {
                console.error("Failed to fetch settings", err);
            } finally {
                setLoading(false);
            }
        };
        fetchSettings();
    }, []);

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
        </div>
    );
}
