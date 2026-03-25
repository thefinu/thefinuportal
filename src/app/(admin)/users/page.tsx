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
} from "lucide-react";
import api from "@/lib/api";

interface User {
    _id: string;
    email: string;
    isSubscribed: boolean;
    currentPeriodEnd: string | null;
    cancelAtPeriodEnd: boolean;
    trialEnd: string | null;
    createdAt: string;
}

export default function UsersPage() {
    const [searchTerm, setSearchTerm] = useState("");
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [deleteModal, setDeleteModal] = useState<User | null>(null);
    const [deleting, setDeleting] = useState(false);
    const [deleteMessage, setDeleteMessage] = useState({ type: "", content: "" });

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

    const filteredUsers = users.filter((user) =>
        user.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

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
                            <tr className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                                <th className="px-6 py-4 bg-secondary text-white">User</th>
                                <th className="px-6 py-4 bg-secondary text-white">Status</th>
                                <th className="px-6 py-4 bg-secondary text-white">Trial End</th>
                                <th className="px-6 py-4 bg-secondary text-white">Billing End</th>
                                <th className="px-6 py-4 bg-secondary text-white">Joined</th>
                                <th className="px-6 py-4 bg-secondary text-white text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredUsers.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                                        No users found
                                    </td>
                                </tr>
                            ) : (
                                filteredUsers.map((user) => (
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
                                            {user.cancelAtPeriodEnd ? (
                                                <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-orange-100 text-orange-800">
                                                    Canceling
                                                </span>
                                            ) : user.isSubscribed ? (
                                                <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-800">
                                                    Subscribed
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-slate-100 text-slate-600">
                                                    Free
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-500">
                                            {user.trialEnd
                                                ? new Date(user.trialEnd).toLocaleDateString()
                                                : <span className="text-slate-300">-</span>
                                            }
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-500">
                                            {user.currentPeriodEnd
                                                ? new Date(user.currentPeriodEnd).toLocaleDateString()
                                                : <span className="text-slate-300">-</span>
                                            }
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-500">
                                            {new Date(user.createdAt).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => {
                                                    setDeleteModal(user);
                                                    setDeleteMessage({ type: "", content: "" });
                                                }}
                                                className="inline-flex items-center rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100 transition-colors"
                                                title="Delete user and all related data"
                                            >
                                                <Trash2 className="mr-1 h-3.5 w-3.5" />
                                                Delete
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Delete Confirmation Modal */}
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
                                <p className={`text-sm font-medium ${
                                    deleteMessage.type === "error" ? "text-red-600" : "text-emerald-600"
                                }`}>
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
                                    {deleting ? (
                                        <Loader2 className="mx-auto h-4 w-4 animate-spin" />
                                    ) : (
                                        "Delete Permanently"
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
