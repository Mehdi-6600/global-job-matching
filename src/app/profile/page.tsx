"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    headline: "",
    skills: "",
    country: "",
    city: "",
    desiredSalary: "",
    searchRadiusKm: "50",
  });

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }
    if (status === "authenticated") {
      fetch("/api/profile")
        .then((r) => r.json())
        .then((data) => {
          if (data.profile) {
            setForm({
              headline: data.profile.headline || "",
              skills: (data.profile.skills || []).join(", "),
              country: data.profile.country || "",
              city: data.profile.city || "",
              desiredSalary: data.profile.desiredSalary?.toString() || "",
              searchRadiusKm: data.profile.searchRadiusKm?.toString() || "50",
            });
          }
        })
        .catch(() => {
          toast({ title: "Error", description: "Failed to load profile", variant: "destructive" });
        });
    }
  }, [status, router]);

  if (status === "loading") {
    return <div className="py-12 text-center">Loading...</div>;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const payload = {
      headline: form.headline,
      skills: form.skills.split(",").map((s) => s.trim()).filter(Boolean),
      country: form.country,
      city: form.city,
      desiredSalary: form.desiredSalary ? parseFloat(form.desiredSalary) : null,
      searchRadiusKm: parseInt(form.searchRadiusKm) || 50,
    };

    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        toast({ title: "Error", description: data.error || "Failed to save", variant: "destructive" });
      } else {
        toast({ title: "Success", description: "Profile saved!" });
        router.push("/jobs");
      }
    } catch {
      toast({ title: "Error", description: "Something went wrong", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg py-8">
      <h1 className="text-2xl font-bold mb-6">Your Profile</h1>
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Professional Title</label>
          <input
            value={form.headline}
            onChange={(e) => setForm({ ...form, headline: e.target.value })}
            placeholder="e.g. Senior Software Engineer"
            className="w-full rounded-md border px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Skills (comma separated)</label>
          <input
            value={form.skills}
            onChange={(e) => setForm({ ...form, skills: e.target.value })}
            placeholder="React, Node.js, TypeScript"
            className="w-full rounded-md border px-3 py-2"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Country</label>
            <input
              value={form.country}
              onChange={(e) => setForm({ ...form, country: e.target.value })}
              placeholder="Germany"
              className="w-full rounded-md border px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">City</label>
            <input
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
              placeholder="Berlin"
              className="w-full rounded-md border px-3 py-2"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Desired Salary (USD)</label>
            <input
              type="number"
              value={form.desiredSalary}
              onChange={(e) => setForm({ ...form, desiredSalary: e.target.value })}
              placeholder="80000"
              className="w-full rounded-md border px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Search Radius (km)</label>
            <input
              type="number"
              value={form.searchRadiusKm}
              onChange={(e) => setForm({ ...form, searchRadiusKm: e.target.value })}
              placeholder="50"
              className="w-full rounded-md border px-3 py-2"
            />
          </div>
        </div>
        <Button type="submit" className="w-full" disabled={saving}>
          {saving ? "Saving..." : "Save & Find Jobs"}
        </Button>
      </form>
    </div>
  );
}
