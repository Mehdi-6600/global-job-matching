"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";

export default function DashboardPage() {
  const { data: session } = useSession();
  const [plan, setPlan] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPlan = async () => {
      try {
        const res = await fetch("/api/user/plan");
        const data = await res.json();
        if (data.plan) setPlan(data.plan);
      } catch (error) {
        console.error("Failed to fetch plan:", error);
      } finally {
        setLoading(false);
      }
    };
    if (session) fetchPlan();
    else setLoading(false);
  }, [session]);

  const getPlanName = (planId: string) => {
    switch (planId) {
      case "free": return "Free";
      case "pro": return "Pro";
      case "employer": return "Employer";
      default: return planId;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-black">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-white">Dashboard</h1>
          <Button variant="outline" className="border-white/20 text-white hover:bg-white/10" onClick={() => signOut()}>
            Sign Out
          </Button>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Welcome Card */}
          <div className="bg-gradient-to-br from-white/5 to-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-white mb-2">Welcome, {session?.user?.name || "User"}</h2>
            <p className="text-sm text-white/60">Role: {session?.user?.role}</p>
            <p className="text-sm text-white/60">{session?.user?.email}</p>
          </div>

          {/* Plan Card */}
          <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 backdrop-blur-lg border border-blue-500/20 rounded-2xl p-6 shadow-xl shadow-blue-500/10">
            <h2 className="text-lg font-semibold text-white mb-2">📋 Your Plan</h2>
            {loading ? (
              <p className="text-sm text-white/60">Loading...</p>
            ) : (
              <>
                <p className="text-3xl font-bold text-transparent bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text">
                  {plan ? getPlanName(plan) : "Free"}
                </p>
                <p className="text-xs text-emerald-400 mt-1">✅ Active</p>
                <Link href="/pricing" className="text-xs text-blue-400 hover:underline mt-2 inline-block">
                  Change Plan →
                </Link>
              </>
            )}
          </div>

          {/* Quick Actions */}
          <Link href="/jobs" className="bg-gradient-to-br from-white/5 to-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-colors shadow-xl">
            <h2 className="text-lg font-semibold text-white mb-2">Browse Jobs</h2>
            <p className="text-sm text-white/60">Find opportunities worldwide</p>
          </Link>

          <Link href="/profile" className="bg-gradient-to-br from-white/5 to-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-colors shadow-xl">
            <h2 className="text-lg font-semibold text-white mb-2">My Profile</h2>
            <p className="text-sm text-white/60">Update your skills and preferences</p>
          </Link>

          <Link href="/payment?plan=pro" className="bg-gradient-to-br from-white/5 to-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-colors shadow-xl">
            <h2 className="text-lg font-semibold text-white mb-2">💳 Subscription</h2>
            <p className="text-sm text-white/60">Upgrade or manage your plan</p>
          </Link>
        </div>
      </div>
    </div>
  );
}
