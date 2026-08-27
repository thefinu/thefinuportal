"use client";

import { useState, useEffect } from "react";
import {
    Wallet,
    Search,
    RefreshCw,
    CheckCircle2,
    XCircle,
    User,
    Trash2,
    ChevronLeft,
    ChevronRight,
} from "lucide-react";
import { getAccounts, deleteAccount } from "@/lib/api";

const PAGE_SIZE = 20;

export default function AccountsPage() {
    const [accounts, setAccounts] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [statusFilter, setStatusFilter] = useState<"all" | "linked" | "pending">("all");

    const fetchAccounts = async () => {
        setIsLoading(true);
        try {
            const response = await getAccounts();
            setAccounts(response.data);
        } catch (error) {
            console.error("Error fetching accounts:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchAccounts();
    }, []);

    const handleDelete = async (acc: any) => {
        const name = acc.account_name || acc.name || acc.account_id;
        if (!window.confirm(`Delete account "${name}"? This will also remove it from Plaid if it's the last account for that institution.`)) {
            return;
        }
        setDeletingId(acc._id);
        try {
            await deleteAccount(acc._id);
            setAccounts((prev) => prev.filter((a) => a._id !== acc._id));
        } catch (error: any) {
            console.error("Error deleting account:", error);
            alert("Error: " + (error.response?.data?.message || error.message));
        } finally {
            setDeletingId(null);
        }
    };

    const filteredAccounts = accounts.filter((acc) => {
        const matchesSearch =
            !searchTerm ||
            (acc.account_name || acc.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
            (acc.mask || "").includes(searchTerm) ||
            (acc.institution_name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
            (acc.user_id?.email || "").toLowerCase().includes(searchTerm.toLowerCase());

        const matchesStatus =
            statusFilter === "all" ||
            (statusFilter === "linked" && acc.is_linked) ||
            (statusFilter === "pending" && !acc.is_linked);

        return matchesSearch && matchesStatus;
    });

    const totalPages = Math.max(1, Math.ceil(filteredAccounts.length / PAGE_SIZE));
    const safePage = Math.min(currentPage, totalPages);
    const paginatedAccounts = filteredAccounts.slice(
        (safePage - 1) * PAGE_SIZE,
        safePage * PAGE_SIZE
    );

    // Reset to page 1 when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, statusFilter]);

    return (
        <div className="p-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">User Accounts</h1>
                    <p className="text-slate-500 text-sm mt-1">
                        Manage and view all linked Plaid accounts
                        <span className="ml-2 text-slate-400">({accounts.length} total)</span>
                    </p>
                </div>
                <button
                    onClick={fetchAccounts}
                    disabled={isLoading}
                    className="flex items-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition-colors disabled:opacity-50"
                >
                    <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
                    Refresh List
                </button>
            </div>

            <div className="mt-8 rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="flex items-center justify-between border-b border-slate-100 p-4">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search by name, email, mask or institution..."
                            className="w-full rounded-lg border border-slate-200 pl-10 pr-4 py-2 text-sm focus:border-secondary focus:outline-none"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="flex gap-1 ml-4">
                        {(["all", "linked", "pending"] as const).map((val) => (
                            <button
                                key={val}
                                onClick={() => setStatusFilter(val)}
                                className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                                    statusFilter === val
                                        ? "bg-secondary text-white"
                                        : "border border-slate-200 text-slate-600 hover:bg-slate-50"
                                }`}
                            >
                                {val.charAt(0).toUpperCase() + val.slice(1)}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="overflow-x-auto">
                    {isLoading ? (
                        <div className="flex h-32 items-center justify-center">
                            <div className="h-8 w-8 animate-spin rounded-full border-4 border-secondary border-t-transparent"></div>
                        </div>
                    ) : (
                        <table className="w-full text-left">
                            <thead>
                                <tr className="text-xs font-semibold uppercase tracking-wider">
                                    <th className="px-6 py-4 bg-secondary text-white">Account Name</th>
                                    <th className="px-6 py-4 bg-secondary text-white">User Email</th>
                                    <th className="px-6 py-4 bg-secondary text-white">Link Status</th>
                                    <th className="px-6 py-4 bg-secondary text-white">Status</th>
                                    <th className="px-6 py-4 bg-secondary text-white">Created At</th>
                                    <th className="px-6 py-4 bg-secondary text-white">Last Update</th>
                                    <th className="px-6 py-4 bg-secondary text-white text-center">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {paginatedAccounts.length > 0 ? (
                                    paginatedAccounts.map((acc) => (
                                        <tr key={acc._id} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center">
                                                    <div className="mr-3 flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                                                        <Wallet className="h-4 w-4 text-primary" />
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-slate-900">{acc.account_name || acc.name}</p>
                                                        <p className="text-xs text-slate-400">{acc.institution_name || "—"} {acc.mask ? `••${acc.mask}` : ""}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center text-sm text-slate-600">
                                                    <User className="mr-2 h-4 w-4 text-slate-400" />
                                                    {acc.user_id?.email || "No Email"}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                {acc.is_linked ? (
                                                    <span className="inline-flex items-center text-emerald-600 text-xs font-medium bg-emerald-50 px-2 py-1 rounded-full">
                                                        <CheckCircle2 className="mr-1 h-3 w-3" />
                                                        Linked
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center text-amber-600 text-xs font-medium bg-amber-50 px-2 py-1 rounded-full">
                                                        <XCircle className="mr-1 h-3 w-3" />
                                                        Pending
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                {acc.is_update ? (
                                                    <span className="text-amber-600 text-xs font-medium bg-amber-50 px-2 py-1 rounded-full">
                                                        Sync pending
                                                    </span>
                                                ) : (
                                                    <span className="text-emerald-600 text-xs font-medium bg-emerald-50 px-2 py-1 rounded-full">
                                                        Up to date
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-slate-500">
                                                {acc.createdAt ? new Date(acc.createdAt).toLocaleDateString() : "N/A"}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-slate-500">
                                                {acc.updatedAt ? new Date(acc.updatedAt).toLocaleDateString() : "N/A"}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center justify-center">
                                                    <button
                                                        onClick={() => handleDelete(acc)}
                                                        disabled={deletingId === acc._id}
                                                        className="flex items-center rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                                                    >
                                                        {deletingId === acc._id ? (
                                                            <div className="h-3 w-3 mr-1.5 animate-spin rounded-full border-2 border-red-600 border-t-transparent" />
                                                        ) : (
                                                            <Trash2 className="mr-1.5 h-3 w-3" />
                                                        )}
                                                        Delete
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={7} className="px-6 py-10 text-center text-slate-500">
                                            No accounts found.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Pagination */}
                {!isLoading && filteredAccounts.length > PAGE_SIZE && (
                    <div className="flex items-center justify-between border-t border-slate-100 px-6 py-4">
                        <p className="text-sm text-slate-500">
                            Showing {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filteredAccounts.length)} of {filteredAccounts.length}
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
        </div>
    );
}
