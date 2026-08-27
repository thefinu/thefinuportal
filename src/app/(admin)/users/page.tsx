"use client";

import { useState, useEffect } from "react";
import {
    Search,
    Download,
    Users,
    Loader2,
    Trash2,
    X,
    AlertTriangle,
    ShieldCheck,
    BarChart2,
    ChevronLeft,
    ChevronRight,
} from "lucide-react";
import api from "@/lib/api";

interface User {
    _id: string;
    email: string;
    isSubscribed: boolean;
    isFreeUser: boolean;
    currentPeriodEnd: string | null;
    cancelAtPeriodEnd: boolean;
    trialEnd: string | null;
    createdAt: string;
}

interface InvoiceItem {
    product: string;
    unitPrice: number;
    quantity: number;
    amount: number;
}

interface MonthlyUsage {
    year: number;
    month: number;
    items: InvoiceItem[];
    subtotal: number;
}

const MONTH_NAMES = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
];

function fmt(value: number) {
    return `$${value.toFixed(2)}`;
}

export default function UsersPage() {
    const [searchTerm, setSearchTerm] = useState("");
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [deleteModal, setDeleteModal] = useState<User | null>(null);
    const [deleting, setDeleting] = useState(false);
    const [deleteMessage, setDeleteMessage] = useState({ type: "", content: "" });
    const [freeUserModal, setFreeUserModal] = useState<User | null>(null);
    const [settingFreeUser, setSettingFreeUser] = useState(false);
    const [freeUserMessage, setFreeUserMessage] = useState({ type: "", content: "" });
    const [currentPage, setCurrentPage] = useState(1);
    const PAGE_SIZE = 20;

    // API Usage modal
    const [usageModal, setUsageModal] = useState<User | null>(null);
    const [monthlyUsage, setMonthlyUsage] = useState<MonthlyUsage | null>(null);
    const [usageLoading, setUsageLoading] = useState(false);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);

    const fetchUsers = async () => {
        try {
            const res = await api.get("/users");
            setUsers(res.data);
        } catch (err) {
            console.error("Failed to fetch users", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchMonthlyUsage = async (userId: string, year: number, month: number) => {
        setUsageLoading(true);
        try {
            const res = await api.get(`/plaid/usage/user/${userId}/monthly?year=${year}&month=${month}`);
            setMonthlyUsage(res.data);
        } catch (err) {
            console.error("Failed to fetch monthly usage", err);
        } finally {
            setUsageLoading(false);
        }
    };

    const openUsageModal = (user: User) => {
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth() + 1;
        setSelectedYear(year);
        setSelectedMonth(month);
        setMonthlyUsage(null);
        setUsageModal(user);
        fetchMonthlyUsage(user._id, year, month);
    };

    const navigateMonth = (dir: -1 | 1) => {
        if (!usageModal) return;
        let m = selectedMonth + dir;
        let y = selectedYear;
        if (m < 1)  { m = 12; y -= 1; }
        if (m > 12) { m = 1;  y += 1; }
        setSelectedMonth(m);
        setSelectedYear(y);
        fetchMonthlyUsage(usageModal._id, y, m);
    };

    const handleDelete = async () => {
        if (!deleteModal) return;
        setDeleting(true);
        setDeleteMessage({ type: "", content: "" });
        try {
            const res = await api.delete(`/users/${deleteModal._id}`);
            setDeleteMessage({ type: "success", content: res.data.message });
            await fetchUsers();
            setTimeout(() => {
                setDeleteModal(null);
                setDeleteMessage({ type: "", content: "" });
            }, 1500);
        } catch (err: any) {
            setDeleteMessage({
                type: "error",
                content: err.response?.data?.message || "Failed to delete user",
            });
        } finally {
            setDeleting(false);
        }
    };

    const handleSetFreeUser = async () => {
        if (!freeUserModal) return;
        setSettingFreeUser(true);
        setFreeUserMessage({ type: "", content: "" });
        try {
            const res = await api.post(`/users/${freeUserModal._id}/set-free-user`);
            setFreeUserMessage({ type: "success", content: res.data.message });
            await fetchUsers();
            setTimeout(() => {
                setFreeUserModal(null);
                setFreeUserMessage({ type: "", content: "" });
            }, 1500);
        } catch (err: any) {
            setFreeUserMessage({
                type: "error",
                content: err.response?.data?.message || "Failed to set free user",
            });
        } finally {
            setSettingFreeUser(false);
        }
    };

    const filteredUsers = users.filter((user) =>
        user.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const totalPages = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE));
    const safePage = Math.min(currentPage, totalPages);
    const paginatedUsers = filteredUsers.slice(
        (safePage - 1) * PAGE_SIZE,
        safePage * PAGE_SIZE
    );

    // Reset to page 1 when search changes
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm]);

    const subtotal   = monthlyUsage?.subtotal ?? 0;
    const tax        = 0;
    const total      = subtotal + tax;

    return (
        <div className="p-8">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-slate-900">Users</h1>
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
                            placeholder="Search by email..."
                            className="w-full rounded-lg border border-slate-200 pl-10 pr-4 py-2 text-sm focus:border-secondary focus:outline-none"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <p className="text-sm text-slate-500 ml-4">{filteredUsers.length} users</p>
                </div>

                {loading ? (
                    <div className="flex justify-center p-8">
                        <Loader2 className="h-8 w-8 animate-spin text-secondary" />
                    </div>
                ) : (
                    <table className="w-full text-left">
                        <thead>
                            <tr className="text-xs font-semibold uppercase tracking-wider">
                                <th className="px-6 py-4 bg-secondary text-white">User</th>
                                <th className="px-6 py-4 bg-secondary text-white">Status</th>
                                <th className="px-6 py-4 bg-secondary text-white">Trial End</th>
                                <th className="px-6 py-4 bg-secondary text-white">Billing End</th>
                                <th className="px-6 py-4 bg-secondary text-white">Joined</th>
                                <th className="px-6 py-4 bg-secondary text-white text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {paginatedUsers.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                                        No users found
                                    </td>
                                </tr>
                            ) : (
                                paginatedUsers.map((user) => (
                                    <tr key={user._id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center">
                                                <div className="mr-3 flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                                                    <Users className="h-4 w-4 text-primary" />
                                                </div>
                                                <div>
                                                    <p className="font-medium text-slate-900">{user.email}</p>
                                                    <p className="text-xs text-slate-400">{user._id.slice(0, 12)}...</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {user.isFreeUser ? (
                                                <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-blue-100 text-blue-800">Free User</span>
                                            ) : user.cancelAtPeriodEnd ? (
                                                <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-orange-100 text-orange-800">Canceling</span>
                                            ) : user.isSubscribed ? (
                                                <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-800">Subscribed</span>
                                            ) : (
                                                <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-slate-100 text-slate-600">Inactive</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-500">
                                            {user.trialEnd ? new Date(user.trialEnd).toLocaleDateString() : <span className="text-slate-300">-</span>}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-500">
                                            {user.currentPeriodEnd ? new Date(user.currentPeriodEnd).toLocaleDateString() : <span className="text-slate-300">-</span>}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-500">
                                            {new Date(user.createdAt).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => openUsageModal(user)}
                                                    className="inline-flex items-center rounded-lg border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-medium text-violet-700 hover:bg-violet-100 transition-colors"
                                                >
                                                    <BarChart2 className="mr-1 h-3.5 w-3.5" />
                                                    API Usage
                                                </button>
                                                {!user.isFreeUser && (
                                                    <button
                                                        onClick={() => { setFreeUserModal(user); setFreeUserMessage({ type: "", content: "" }); }}
                                                        className="inline-flex items-center rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100 transition-colors"
                                                    >
                                                        <ShieldCheck className="mr-1 h-3.5 w-3.5" />
                                                        Set as Free User
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => { setDeleteModal(user); setDeleteMessage({ type: "", content: "" }); }}
                                                    className="inline-flex items-center rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100 transition-colors"
                                                >
                                                    <Trash2 className="mr-1 h-3.5 w-3.5" />
                                                    Delete
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                )}

                {/* Pagination */}
                {!loading && filteredUsers.length > PAGE_SIZE && (
                    <div className="flex items-center justify-between border-t border-slate-100 px-6 py-4">
                        <p className="text-sm text-slate-500">
                            Showing {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filteredUsers.length)} of {filteredUsers.length}
                        </p>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                disabled={safePage === 1}
                                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent"
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </button>
                            {Array.from({ length: totalPages }, (_, i) => i + 1)
                                .filter((p) => p === 1 || p === totalPages || Math.abs(p - safePage) <= 1)
                                .reduce<(number | "...")[]>((acc, p, i, arr) => {
                                    if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push("...");
                                    acc.push(p);
                                    return acc;
                                }, [])
                                .map((p, i) =>
                                    p === "..." ? (
                                        <span key={`dots-${i}`} className="px-2 text-slate-400">…</span>
                                    ) : (
                                        <button
                                            key={p}
                                            onClick={() => setCurrentPage(p as number)}
                                            className={`min-w-[2rem] rounded-lg px-2 py-1 text-sm font-medium transition-colors ${
                                                safePage === p
                                                    ? "bg-secondary text-white"
                                                    : "text-slate-600 hover:bg-slate-100"
                                            }`}
                                        >
                                            {p}
                                        </button>
                                    )
                                )}
                            <button
                                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                                disabled={safePage === totalPages}
                                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent"
                            >
                                <ChevronRight className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* ── API Usage Modal (invoice style) ── */}
            {usageModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="w-full max-w-2xl rounded-xl bg-white shadow-xl">
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-100">
                            <div>
                                <h2 className="text-lg font-semibold text-slate-900">API Usage</h2>
                                <p className="text-xs text-slate-500 mt-0.5">{usageModal.email}</p>
                            </div>
                            <button onClick={() => setUsageModal(null)} className="text-slate-400 hover:text-slate-600">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Month navigation */}
                        <div className="flex items-center justify-center gap-4 px-6 py-3 border-b border-slate-100 bg-slate-50">
                            <button
                                onClick={() => navigateMonth(-1)}
                                className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-200 transition-colors"
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </button>
                            <span className="text-sm font-semibold text-slate-700 w-36 text-center">
                                {MONTH_NAMES[selectedMonth - 1]} {selectedYear}
                            </span>
                            <button
                                onClick={() => navigateMonth(1)}
                                className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-200 transition-colors"
                            >
                                <ChevronRight className="h-4 w-4" />
                            </button>
                        </div>

                        {/* Invoice body */}
                        <div className="px-6 py-4">
                            {usageLoading ? (
                                <div className="flex justify-center py-12">
                                    <Loader2 className="h-6 w-6 animate-spin text-secondary" />
                                </div>
                            ) : (
                                <>
                                    {/* Line items table */}
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b border-slate-200">
                                                <th className="pb-3 text-left font-semibold text-slate-600">Item</th>
                                                <th className="pb-3 text-right font-semibold text-slate-600">Unit price</th>
                                                <th className="pb-3 text-right font-semibold text-slate-600">Quantity</th>
                                                <th className="pb-3 text-right font-semibold text-slate-600">Amount</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {monthlyUsage?.items.map((item) => (
                                                <tr key={item.product}>
                                                    <td className="py-3 text-slate-700">{item.product} usage</td>
                                                    <td className="py-3 text-right text-slate-500">{fmt(item.unitPrice)}</td>
                                                    <td className={`py-3 text-right font-medium ${item.quantity > 0 ? 'text-secondary' : 'text-slate-400'}`}>
                                                        {item.quantity}
                                                    </td>
                                                    <td className="py-3 text-right font-medium text-slate-800">{fmt(item.amount)}</td>
                                                </tr>
                                            ))}
                                            {!monthlyUsage && (
                                                <tr>
                                                    <td colSpan={4} className="py-6 text-center text-slate-400">No data</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>

                                    {/* Totals */}
                                    <div className="mt-4 border-t border-slate-200 pt-4 space-y-1.5">
                                        <div className="flex justify-end gap-16 text-sm text-slate-600">
                                            <span>Subtotal</span>
                                            <span className="w-20 text-right font-medium text-slate-800">{fmt(subtotal)}</span>
                                        </div>
                                        <div className="flex justify-end gap-16 text-sm text-slate-600">
                                            <span>Tax</span>
                                            <span className="w-20 text-right font-medium text-slate-800">{fmt(tax)}</span>
                                        </div>
                                        <div className="flex justify-end gap-16 text-sm text-slate-600">
                                            <span>Total</span>
                                            <span className="w-20 text-right font-medium text-slate-800">{fmt(total)}</span>
                                        </div>
                                        <div className="flex justify-end gap-16 pt-2 border-t border-slate-200 text-sm">
                                            <span className="font-bold text-slate-800">Amount due:</span>
                                            <span className="w-20 text-right font-bold text-slate-900">{fmt(total)}</span>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>

                        <div className="flex justify-end px-6 pb-6">
                            <button
                                onClick={() => setUsageModal(null)}
                                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Delete Confirmation Modal ── */}
            {deleteModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold text-slate-900">Delete User</h2>
                            <button onClick={() => setDeleteModal(null)} className="text-slate-400 hover:text-slate-600">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="space-y-4">
                            <div className="flex items-start gap-3 p-4 rounded-lg bg-red-50 border border-red-100">
                                <AlertTriangle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-sm font-medium text-red-800">This action cannot be undone</p>
                                    <p className="text-xs text-red-600 mt-1">
                                        This will permanently delete the user and all related data including accounts, transactions, subscriptions, spreadsheets, and Stripe customer data.
                                    </p>
                                </div>
                            </div>
                            <div>
                                <p className="text-sm text-slate-600">User</p>
                                <p className="font-medium text-slate-900">{deleteModal.email}</p>
                            </div>
                            {deleteMessage.content && (
                                <p className={`text-sm font-medium ${deleteMessage.type === "error" ? "text-red-600" : "text-emerald-600"}`}>
                                    {deleteMessage.content}
                                </p>
                            )}
                            <div className="flex gap-3 pt-2">
                                <button
                                    onClick={() => setDeleteModal(null)}
                                    className="flex-1 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleDelete}
                                    disabled={deleting}
                                    className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors disabled:opacity-50"
                                >
                                    {deleting ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : "Delete Permanently"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Set Free User Modal ── */}
            {freeUserModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold text-slate-900">Set as Free User</h2>
                            <button onClick={() => setFreeUserModal(null)} className="text-slate-400 hover:text-slate-600">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="space-y-4">
                            <div className="flex items-start gap-3 p-4 rounded-lg bg-blue-50 border border-blue-100">
                                <ShieldCheck className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-sm font-medium text-blue-800">Confirm free user access</p>
                                    <p className="text-xs text-blue-600 mt-1">
                                        This will cancel the user&apos;s Stripe subscription and grant permanent free access. The user&apos;s data (accounts, transactions, spreadsheets) will be preserved.
                                    </p>
                                </div>
                            </div>
                            <div>
                                <p className="text-sm text-slate-600">User</p>
                                <p className="font-medium text-slate-900">{freeUserModal.email}</p>
                            </div>
                            {freeUserMessage.content && (
                                <p className={`text-sm font-medium ${freeUserMessage.type === "error" ? "text-red-600" : "text-emerald-600"}`}>
                                    {freeUserMessage.content}
                                </p>
                            )}
                            <div className="flex gap-3 pt-2">
                                <button
                                    onClick={() => setFreeUserModal(null)}
                                    className="flex-1 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSetFreeUser}
                                    disabled={settingFreeUser}
                                    className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors disabled:opacity-50"
                                >
                                    {settingFreeUser ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : "Confirm Free User"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
