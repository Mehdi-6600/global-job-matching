"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";

export default function DashboardPage() {
  const { data: session } = useSession();
  const [plan, setPlan] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPlan = async () => {
      try {
        const res = await fetch("/api/user/plan");
        const data = await res.json();
        if (data.plan) {
          setPlan(data.plan);
        }
      } catch (error) {
        console.error("Failed to fetch plan:", error);
      } finally {
        setLoading(false);
      }
    };

    if (session) {
      fetchPlan();
    } else {
      setLoading(false);
    }
  }, [session]);

  // تابع برای دریافت نام پلن به فارسی
  const getPlanName = (planId: string) => {
    switch (planId) {
      case "free": return "رایگان";
      case "pro": return "حرفه‌ای";
      case "employer": return "کارفرما";
      default: return planId;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <Button variant="outline" onClick={() => signOut()}>Sign Out</Button>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* کارت خوش‌آمدگویی */}
        <div className="border rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-2">Welcome, {session?.user?.name || "User"}</h2>
          <p className="text-sm text-muted-foreground">Role: {session?.user?.role}</p>
          <p className="text-sm text-muted-foreground">{session?.user?.email}</p>
        </div>

        {/* کارت وضعیت اشتراک */}
        <div className="border rounded-lg p-6 bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
          <h2 className="text-lg font-semibold mb-2">📋 Your Plan</h2>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : (
            <>
              <p className="text-2xl font-bold text-blue-700">
                {plan ? getPlanName(plan) : "رایگان"}
              </p>
              <p className="text-xs text-green-600 mt-1">
                ✅ Active
              </p>
              <Link href="/pricing" className="text-xs text-blue-600 hover:underline mt-2 inline-block">
                Change Plan →
              </Link>
            </>
          )}
        </div>
        
        {/* کارت Browse Jobs */}
        <Link href="/jobs" className="border rounded-lg p-6 hover:bg-accent transition-colors">
          <h2 className="text-lg font-semibold mb-2">Browse Jobs</h2>
          <p className="text-sm text-muted-foreground">Find opportunities worldwide</p>
        </Link>
        
        {/* کارت My Profile */}
        <Link href="/profile" className="border rounded-lg p-6 hover:bg-accent transition-colors">
          <h2 className="text-lg font-semibold mb-2">My Profile</h2>
          <p className="text-sm text-muted-foreground">Update your skills and preferences</p>
        </Link>

        {/* کارت Subscription */}
        <Link href="/payment?plan=pro" className="border rounded-lg p-6 hover:bg-accent transition-colors">
          <h2 className="text-lg font-semibold mb-2">💳 Subscription</h2>
          <p className="text-sm text-muted-foreground">Upgrade or manage your plan</p>
        </Link>
      </div>
    </div>
  );
}
