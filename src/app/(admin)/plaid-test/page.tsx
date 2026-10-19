"use client";

import { useEffect, useState } from "react";
import { RefreshCw, Copy, Check } from "lucide-react";
import api from "@/lib/api";

interface UserOption {
    id: string;
    email: string;
}

export default function PlaidTestPage() {
    const [users, setUsers] = useState<UserOption[]>([]);
    const [selectedUserId, setSelectedUserId] = useState("");
    const [result, setResult] = useState<any>(null);
    const [loadingUsers, setLoadingUsers] = useState(true);
    const [loadingAccounts, setLoadingAccounts] = useState(false);
    const [error, setError] = useState("");
    const [copied, setCopied] = useState(false);

    const fetchUsers = async () => {
        setLoadingUsers(true);
        setError("");
        try {
            const res = await api.get("/accounts/admin/plaid-test/users");
            setUsers(res.data);
        } catch (err: any) {
            setError(err.response?.data?.message || "Could not load users");
        } finally {
            setLoadingUsers(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchAccounts = async (userId: string) => {
        setSelectedUserId(userId);
        setResult(null);
        setError("");
        if (!userId) return;

        setLoadingAccounts(true);
        try {
            const res = await api.get("/accounts/admin/plaid-test/accounts", { params: { userId } });
            setResult(res.data);
        } catch (err: any) {
            setError(err.response?.data?.message || "Could not load Plaid account details");
        } finally {
            setLoadingAccounts(false);
        }
    };

    const json = result ? JSON.stringify(result, null, 2) : "";

    const handleCopy = async () => {
        if (!json) return;
        try {
            await navigator.clipboard.writeText(json);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        } catch {
            // Clipboard API unavailable (e.g. insecure context) — nothing more we can do here.
        }
    };

    return (
        <div className="p-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Plaid Test</h1>
                    <p className="text-slate-500 text-sm mt-1">
                        Connected Plaid account details for one user, as raw JSON. For debugging — the
                        Plaid access token is never included.
                    </p>
                </div>
                <button
                    onClick={fetchUsers}
                    disabled={loadingUsers}
                    className="flex items-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition-colors disabled:opacity-60"
                >
                    <RefreshCw className={`mr-2 h-4 w-4 ${loadingUsers ? "animate-spin" : ""}`} />
                    Refresh Users
                </button>
            </div>

            <div className="mt-6 flex items-center gap-3">
                <label htmlFor="plaid-test-user" className="text-sm font-medium text-slate-700">
                    User
                </label>
                <select
                    id="plaid-test-user"
                    value={selectedUserId}
                    onChange={(e) => fetchAccounts(e.target.value)}
                    disabled={loadingUsers}
                    className="min-w-[320px] rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-secondary disabled:opacity-60"
                >
                    <option value="">
                        {loadingUsers ? "Loading users…" : "Select a user with connected accounts…"}
                    </option>
                    {users.map((u) => (
                        <option key={u.id} value={u.id}>
                            {u.email}
                        </option>
                    ))}
                </select>
                {loadingAccounts && <RefreshCw className="h-4 w-4 animate-spin text-slate-400" />}
                {!loadingUsers && users.length === 0 && !error && (
                    <span className="text-sm text-slate-400">No users with connected accounts yet.</span>
                )}
            </div>

            {error && (
                <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
                    {error}
                </div>
            )}

            {result && (
                <div className="mt-6">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-slate-700">
                            {result.accountCount} account{result.accountCount === 1 ? "" : "s"} for{" "}
                            <span className="font-semibold">{result.user?.email}</span>
                        </span>
                        <button
                            onClick={handleCopy}
                            className="flex items-center rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                        >
                            {copied ? (
                                <Check className="mr-1.5 h-3.5 w-3.5 text-emerald-500" />
                            ) : (
                                <Copy className="mr-1.5 h-3.5 w-3.5" />
                            )}
                            {copied ? "Copied" : "Copy JSON"}
                        </button>
                    </div>
                    <pre className="max-h-[70vh] overflow-auto rounded-xl bg-slate-950 p-4 text-xs leading-relaxed text-emerald-300 font-mono whitespace-pre">
                        {json}
                    </pre>
                </div>
            )}
        </div>
    );
}
