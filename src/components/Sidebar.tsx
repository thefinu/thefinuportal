"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
    LayoutDashboard,
    Wallet,
    Settings,
    Users,
    LogOut,
    CreditCard
} from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

const menuItems = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Users", href: "/users", icon: Users },
    { name: "Accounts", href: "/accounts", icon: Wallet },
    { name: "Subscriptions", href: "/subscriptions", icon: CreditCard },
    { name: "Settings", href: "/settings", icon: Settings },
];



export default function Sidebar() {
    const pathname = usePathname();
    const router = useRouter();

    const handleLogout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("admin");
        // Clear the middleware auth cookie
        document.cookie = "admin_token=; path=/; Max-Age=0; SameSite=Lax; Secure";
        router.push("/login");
    };

    return (
        <div className="flex h-screen w-64 flex-col sticky top-0 shrink-0 shadow-xl z-20">
            <div className="h-24 flex items-center justify-center px-6 border-b border-white/5">
                <Link href="/dashboard" className="block transition-all hover:opacity-80 active:scale-95">
                    <img
                        src="/logo.png"
                        alt="ThefinU Admin"
                        className="h-20 w-auto"
                    />
                </Link>
            </div>

            <nav className="flex-1 space-y-1 px-4 py-4">
                {menuItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            className={cn(
                                "flex items-center rounded-lg px-4 py-3 text-sm font-medium transition-colors",
                                isActive
                                    ? "bg-secondary text-white"
                                    : "hover:bg-secondary hover:text-white"
                            )}
                        >
                            <item.icon className="mr-3 h-5 w-5" />
                            {item.name}
                        </Link>
                    );
                })}
            </nav>

            <div className="border-t border-slate-800 p-4 space-y-2">
                <button
                    onClick={handleLogout}
                    className="flex w-full items-center rounded-lg px-4 py-2 text-sm font-medium text-rose-400 transition-colors cursor-pointer"
                >
                    <LogOut className="mr-3 h-5 w-5" />
                    Logout
                </button>
                <div className="text-center pt-2">
                    <span className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">v1.0.0 © ThefinU</span>
                </div>
            </div>
        </div>
    );
}
