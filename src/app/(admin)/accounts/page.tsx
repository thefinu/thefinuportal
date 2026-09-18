"use client";

import { useState, useEffect, Fragment } from "react";
import {
    Search,
    ChevronDown,
    ChevronRight,
    CheckCircle2,
    XCircle,
    RefreshCw,
    Trash2,
    ExternalLink,
} from "lucide-react";
import api from "@/lib/api";

interface AccountSpreadsheet {
    spreadsheetId: string;
    isLinked: boolean;
    hasPendingUpdates: boolean;
}

interface AdminAccount {
    id: string;
    account_id: string;
    name: string;
    institution_name: string;
    mask: string;
    status: boolean;
    plaidEnv: string | null;
    spreadsheets: AccountSpreadsheet[];
}

interface UserGroup {
    userId: string;
    email: string;
    isSubscribed: boolean;
    isFreeUser: boolean;
    accountCount: number;
    spreadsheetCount: number;
    accounts: AdminAccount[];
}

export default function AccountsPage() {
    const [groups, setGroups] = useState<UserGroup[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [expanded, setExpanded] = useState<Record<string, boolean>>({});
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const fetchAccounts = async () => {
        setIsLoading(true);
        try {
            const response = await api.get("/accounts/admin/by-user");
            setGroups(response.data);
        } catch (error) {
            console.error("Error fetching accounts:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchAccounts();
    }, []);

    const toggleRow = (userId: string) => {
        setExpanded((prev) => ({ ...prev, [userId]: !prev[userId] }));
    };

    const handleDeleteAccount = async (account: AdminAccount, email: string) => {
        const inUse = account.spreadsheets.length;
        const warning = inUse > 0
            ? `\n\nIt is currently synced by ${inUse} spreadsheet${inUse === 1 ? "" : "s"}, which will stop syncing it.`
            : "";

        if (!window.confirm(
            `Delete "${account.name}" for ${email}?${warning}\n\nThe bank connection is removed from Plaid and this cannot be undone.`
        )) {
            return;
        }

        setDeletingId(account.id);
        try {
            const response = await api.delete(`/accounts/admin/${account.id}`);
            if (response.data?.plaidItemRemoved === false) {
                alert("Account deleted. Its Plaid connection is shared with another account, so the connection was left in place.");
            }
            await fetchAccounts();
        } catch (error: any) {
            alert("Could not delete the account: " + (error.response?.data?.message || error.message));
        } finally {
            setDeletingId(null);
        }
    };

    // Matches a user by their own email or by anything in their accounts, so searching
    // for a bank name still finds the user it belongs to.
    const term = searchTerm.trim().toLowerCase();
    const filteredGroups = term
        ? groups.filter((g) =>
            g.email.toLowerCase().includes(term) ||
            g.accounts.some((a) =>
                a.name.toLowerCase().includes(term) ||
                a.institution_name.toLowerCase().includes(term) ||
                a.mask.includes(term)
            )
        )
        : groups;

    return (
        <div className="p-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">User Accounts</h1>
                    <p className="text-slate-500 text-sm mt-1">Connected bank accounts, grouped by user</p>
                </div>
                <button
                    onClick={fetchAccounts}
                    disabled={isLoading}
                    className="flex items-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition-colors disabled:opacity-60"
                >
                    <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
                    Refresh
                </button>
            </div>

            <div className="mt-8 rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="border-b border-slate-100 p-4">
                    <div className="relative max-w-md">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search by email, account, institution or mask..."
                            className="w-full rounded-lg border border-slate-200 pl-10 pr-4 py-2 text-sm focus:border-secondary focus:outline-none"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
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
                                <tr className="bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
                                    <th className="px-6 py-4 bg-secondary text-white">User</th>
                                    <th className="px-6 py-4 bg-secondary text-white text-center">Connected Accounts</th>
                                    <th className="px-6 py-4 bg-secondary text-white text-center">Connected Spreadsheets</th>
                                    <th className="px-6 py-4 bg-secondary text-white text-center">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredGroups.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-10 text-center text-sm text-slate-500">
                                            {term ? "No users match that search." : "No users yet."}
                                        </td>
                                    </tr>
                                ) : (
                                    filteredGroups.map((group) => (
                                        <Fragment key={group.userId}>
                                            <tr className="hover:bg-slate-50/60">
                                                <td className="px-6 py-4">
                                                    <div className="font-medium text-slate-900">{group.email}</div>
                                                    <div className="mt-0.5 text-xs text-slate-400">
                                                        {group.isFreeUser ? "Free user" : group.isSubscribed ? "Subscribed" : "Not subscribed"}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-center tabular-nums text-slate-700">
                                                    {group.accountCount}
                                                </td>
                                                <td className="px-6 py-4 text-center tabular-nums text-slate-700">
                                                    {group.spreadsheetCount}
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <button
                                                        onClick={() => toggleRow(group.userId)}
                                                        disabled={group.accountCount === 0}
                                                        className="inline-flex items-center rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-transparent"
                                                    >
                                                        {expanded[group.userId]
                                                            ? <ChevronDown className="mr-1.5 h-4 w-4" />
                                                            : <ChevronRight className="mr-1.5 h-4 w-4" />}
                                                        {expanded[group.userId] ? "Hide" : "View"} accounts
                                                    </button>
                                                </td>
                                            </tr>

                                            {expanded[group.userId] && (
                                                <tr className="bg-slate-50/60">
                                                    <td colSpan={4} className="px-6 py-4">
                                                        <table className="w-full text-left text-sm">
                                                            <thead>
                                                                <tr className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                                                                    <th className="pb-2 pr-4">Account Name</th>
                                                                    <th className="pb-2 pr-4">Link Status</th>
                                                                    <th className="pb-2 pr-4">Sync Status</th>
                                                                    <th className="pb-2 pr-4">Spreadsheet</th>
                                                                    <th className="pb-2 text-center">Action</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="divide-y divide-slate-200">
                                                                {group.accounts.flatMap((account) => {
                                                                    // One line per spreadsheet syncing the account. An account no
                                                                    // spreadsheet has claimed still gets a line, so it stays visible.
                                                                    const rows: (AccountSpreadsheet | null)[] =
                                                                        account.spreadsheets.length > 0 ? account.spreadsheets : [null];

                                                                    return rows.map((sheet, i) => (
                                                                        <tr key={`${account.id}-${sheet?.spreadsheetId || "unclaimed"}`}>
                                                                            <td className="py-3 pr-4">
                                                                                {i === 0 && (
                                                                                    <>
                                                                                        <div className="font-medium text-slate-800">{account.name}</div>
                                                                                        <div className="text-xs text-slate-400">
                                                                                            {account.institution_name || "—"}
                                                                                            {account.mask ? ` ••${account.mask}` : ""}
                                                                                        </div>
                                                                                    </>
                                                                                )}
                                                                            </td>
                                                                            <td className="py-3 pr-4">
                                                                                {sheet?.isLinked ? (
                                                                                    <span className="inline-flex items-center text-emerald-700">
                                                                                        <CheckCircle2 className="mr-1.5 h-4 w-4" /> Linked
                                                                                    </span>
                                                                                ) : (
                                                                                    <span className="inline-flex items-center text-slate-400">
                                                                                        <XCircle className="mr-1.5 h-4 w-4" /> Not linked
                                                                                    </span>
                                                                                )}
                                                                            </td>
                                                                            <td className="py-3 pr-4 text-slate-600">
                                                                                {!sheet
                                                                                    ? "—"
                                                                                    : sheet.hasPendingUpdates
                                                                                        ? "Updates waiting"
                                                                                        : "Up to date"}
                                                                            </td>
                                                                            <td className="py-3 pr-4">
                                                                                {sheet ? (
                                                                                    <a
                                                                                        href={`https://docs.google.com/spreadsheets/d/${sheet.spreadsheetId}/edit`}
                                                                                        target="_blank"
                                                                                        rel="noopener noreferrer"
                                                                                        className="inline-flex items-center font-mono text-xs text-slate-500 hover:text-secondary"
                                                                                        title={sheet.spreadsheetId}
                                                                                    >
                                                                                        {sheet.spreadsheetId.slice(0, 14)}…
                                                                                        <ExternalLink className="ml-1 h-3 w-3" />
                                                                                    </a>
                                                                                ) : (
                                                                                    <span className="text-xs text-slate-400">Not claimed yet</span>
                                                                                )}
                                                                            </td>
                                                                            <td className="py-3 text-center">
                                                                                {i === 0 && (
                                                                                    <button
                                                                                        onClick={() => handleDeleteAccount(account, group.email)}
                                                                                        disabled={deletingId === account.id}
                                                                                        className="inline-flex items-center rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50 disabled:opacity-50"
                                                                                    >
                                                                                        <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                                                                                        {deletingId === account.id ? "Deleting…" : "Delete"}
                                                                                    </button>
                                                                                )}
                                                                            </td>
                                                                        </tr>
                                                                    ));
                                                                })}
                                                            </tbody>
                                                        </table>
                                                    </td>
                                                </tr>
                                            )}
                                        </Fragment>
                                    ))
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
}
