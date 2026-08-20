"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

export default function ContactPage() {
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const form = new FormData(e.currentTarget);
    
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.get("name"),
          email: form.get("email"),
          message: form.get("message"),
        }),
      });
      
      if (res.ok) {
        toast({ title: "Sent", description: "We will get back to you soon." });
        (e.target as HTMLFormElement).reset();
      } else {
        toast({ title: "Error", description: "Failed to send message.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Something went wrong.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-lg mx-auto py-12">
      <h1 className="text-3xl font-bold mb-2">Contact Us</h1>
      <p className="text-muted-foreground mb-6">
        Have a question or feedback? We would love to hear from you.
      </p>
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Name</label>
          <input name="name" required className="w-full rounded-md border px-3 py-2 bg-background" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Email</label>
          <input name="email" type="email" required className="w-full rounded-md border px-3 py-2 bg-background" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Message</label>
          <textarea name="message" required rows={5} className="w-full rounded-md border px-3 py-2 bg-background" />
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Sending..." : "Send Message"}
        </Button>
      </form>
      <p className="mt-6 text-sm text-muted-foreground text-center">
        Or email us directly at <a href="mailto:support@globaljobmatching.com" className="underline">support@globaljobmatching.com</a>
      </p>
    </div>
  );
}
