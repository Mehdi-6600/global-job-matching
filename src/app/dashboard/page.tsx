"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function DashboardPage() {
  const { data: session } = useSession();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <Button variant="outline" onClick={() => signOut()}>Sign Out</Button>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <div className="border rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-2">Welcome, {session?.user?.name || "User"}</h2>
          <p className="text-sm text-muted-foreground">Role: {session?.user?.role}</p>
          <p className="text-sm text-muted-foreground">{session?.user?.email}</p>
        </div>
        
        <Link href="/jobs" className="border rounded-lg p-6 hover:bg-accent transition-colors">
          <h2 className="text-lg font-semibold mb-2">Browse Jobs</h2>
          <p className="text-sm text-muted-foreground">Find opportunities worldwide</p>
        </Link>
        
        <Link href="/profile" className="border rounded-lg p-6 hover:bg-accent transition-colors">
          <h2 className="text-lg font-semibold mb-2">My Profile</h2>
          <p className="text-sm text-muted-foreground">Update your skills and preferences</p>
        </Link>
      </div>
    </div>
  );
}
