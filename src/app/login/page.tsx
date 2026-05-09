"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, Mail, Loader2, CircleDollarSign } from "lucide-react";
import api from "@/lib/api";

export default function LoginPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [formData, setFormData] = useState({
        email: "",
        password: ""
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const res = await api.post("/auth/login", formData);
            localStorage.setItem("token", res.data.token);
            localStorage.setItem("admin", JSON.stringify(res.data.admin));
            // Set cookie so middleware can protect admin routes server-side
            document.cookie = `admin_token=${res.data.token}; path=/; SameSite=Lax; Secure; Max-Age=86400`;
            router.push("/dashboard");
        } catch (err: any) {
            setError(err.response?.data?.message || "Login failed. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center p-6 font-sans">
            <div className="w-full max-w-md">
                <div className="mb-8 flex flex-col items-center justify-center text-center">
                    <div className="flex h-16 w-16 items-center justify-center overflow-hidden">
                        <img src="/logo.png" alt="Icon" className="h-full w-full object-cover" />
                    </div>
                    <h1 className="mt-6 text-3xl font-bold">Welcome back</h1>
                    <p className="mt-2 text-slate-400">Please enter your details to sign in.</p>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8 shadow-2xl">
                    {error && (
                        <div className="mb-6 rounded-lg bg-rose-500/10 p-3 text-sm text-rose-500 border border-rose-500/20">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-slate-300">Email Address</label>
                            <div className="mt-1 relative">
                                <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
                                <input
                                    type="email"
                                    required
                                    className="block w-full rounded-lg border border-slate-800 bg-slate-950 px-10 py-3 text-white placeholder-slate-600 focus:border-secondary focus:outline-none transition-colors"
                                    placeholder="admin@example.com"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-300">Password</label>
                            <div className="mt-1 relative">
                                <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
                                <input
                                    type="password"
                                    required
                                    className="block w-full rounded-lg border border-slate-800 bg-slate-950 px-10 py-3 text-white placeholder-slate-600 focus:border-secondary focus:outline-none transition-colors"
                                    placeholder="••••••••"
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="flex w-full items-center justify-center rounded-lg bg-primary px-4 py-3 text-sm font-bold text-white hover:opacity-90 transition-all disabled:opacity-50 cursor-pointer"
                        >
                            {loading ? (
                                <Loader2 className="h-5 w-5 animate-spin" />
                            ) : (
                                "Sign in"
                            )}
                        </button>
                    </form>
                </div>

                <p className="mt-8 text-center text-xs text-slate-500 uppercase tracking-widest">
                    ThefinU Admin
                </p>
            </div>
        </div>
    );
}
