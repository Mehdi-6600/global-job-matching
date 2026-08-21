"use client";

import { useState } from "react";
import { sendContactMessage } from "./actions";

export default function ContactForm() {
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const result = await sendContactMessage(formData);
    setStatus(result.success ? "success" : "error");
    setLoading(false);
    if (result.success) {
      (e.target as HTMLFormElement).reset();
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-[var(--text-primary)] mb-1">
          Full Name
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          className="glass-input w-full"
          placeholder="John Doe"
        />
      </div>
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-[var(--text-primary)] mb-1">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          className="glass-input w-full"
          placeholder="john@example.com"
        />
      </div>
      <div>
        <label htmlFor="subject" className="block text-sm font-medium text-[var(--text-primary)] mb-1">
          Subject
        </label>
        <input
          id="subject"
          name="subject"
          type="text"
          required
          className="glass-input w-full"
          placeholder="How can we help?"
        />
      </div>
      <div>
        <label htmlFor="message" className="block text-sm font-medium text-[var(--text-primary)] mb-1">
          Message
        </label>
        <textarea
          id="message"
          name="message"
          rows={5}
          required
          className="glass-input w-full resize-none"
          placeholder="Tell us more..."
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="btn-primary w-full"
      >
        {loading ? "Sending..." : "Send Message"}
      </button>
      {status === "success" && (
        <p className="text-sm text-green-500 text-center">Message sent successfully!</p>
      )}
      {status === "error" && (
        <p className="text-sm text-red-500 text-center">Something went wrong. Please try again.</p>
      )}
    </form>
  );
}
