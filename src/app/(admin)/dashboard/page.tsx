"use client";

import { useState, useEffect } from "react";
import StatsCard from "@/components/StatsCard";
import {
  Users,
  Wallet,
  DollarSign,
  Briefcase
} from "lucide-react";
import { getDashboardStats } from "@/lib/api";

interface Stats {
  totalUsers: number;
  subscribedUsers: number;
  totalAccounts: number;
  activeAccounts: number;
  totalRevenue: number;
  userGrowth: string;
  accountGrowth: string;
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await getDashboardStats();
        setStats(res.data);
      } catch (err) {
        console.error("Failed to fetch dashboard stats", err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between border-b border-primary/10 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-primary">Financial Overview</h1>
          <p className="text-slate-500 mt-1">Welcome back, <span className="text-secondary font-semibold">Admin</span></p>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Users"
          amount={loading ? "..." : stats?.totalUsers.toString() || "0"}
          trend="up"
          percentage={stats?.userGrowth || "+0%"}
          icon={Users}
          color="bg-primary"
        />
        <StatsCard
          title="Subscribed Users"
          amount={loading ? "..." : stats?.subscribedUsers.toString() || "0"}
          trend="up"
          percentage={`${stats ? Math.round((stats.subscribedUsers / (stats.totalUsers || 1)) * 100) : 0}%`}
          icon={Briefcase}
          color="bg-secondary"
        />
        <StatsCard
          title="Connected Accounts"
          amount={loading ? "..." : stats?.activeAccounts.toString() || "0"}
          trend="up"
          percentage={stats?.accountGrowth || "+0%"}
          icon={Wallet}
          color="bg-accent"
        />
        <StatsCard
          title="Total Revenue"
          amount={loading ? "..." : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(stats?.totalRevenue || 0)}
          trend="up"
          percentage="+0.0%"
          icon={DollarSign}
          color="bg-secondary"
        />
      </div>

      <div className="mt-8">
        <div className="rounded-xl border border-primary/10 bg-white p-6 shadow-md min-h-[300px]">
          <h3 className="text-lg font-bold text-primary">Spending Overview</h3>
          <div className="mt-4 flex items-center justify-center text-slate-400 border-2 border-dashed border-secondary/20 rounded-lg min-h-[200px]">
            [Chart Placeholder - Implementing Recharts soon]
          </div>
        </div>
      </div>
    </div>
  );
}
