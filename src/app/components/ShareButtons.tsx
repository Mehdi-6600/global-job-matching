"use client";

import { useState } from "react";
import { Twitter, Linkedin, Facebook, Link2, CheckCircle2 } from "lucide-react";
import { useLocale } from "@/components/locale-provider";

export default function ShareButtons({ title, url }: { title: string; url: string }) {
  const { t } = useLocale();
  const [copied, setCopied] = useState(false);

  function share(platform: string) {
    const encodedUrl = encodeURIComponent(url);
    const encodedTitle = encodeURIComponent(title);

    const links: Record<string, string> = {
      twitter: `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    };

    if (links[platform]) {
      window.open(links[platform], "_blank", "width=600,height=400");
    }
  }

  function copyLink() {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-[var(--text-muted)] me-1">Share:</span>
      <button
        onClick={() => share("twitter")}
        className="p-2 rounded-lg bg-[var(--surface-2)] hover:bg-[var(--info-soft)] text-[var(--text-muted)] hover:text-[var(--info)] transition-all"
        title="Twitter"
        aria-label="Twitter"
      >
        <Twitter className="w-4 h-4" />
      </button>
      <button
        onClick={() => share("linkedin")}
        className="p-2 rounded-lg bg-[var(--surface-2)] hover:bg-[var(--info-soft)] text-[var(--text-muted)] hover:text-[var(--info)] transition-all"
        title="LinkedIn"
        aria-label="LinkedIn"
      >
        <Linkedin className="w-4 h-4" />
      </button>
      <button
        onClick={() => share("facebook")}
        className="p-2 rounded-lg bg-[var(--surface-2)] hover:bg-[var(--brand-accent-soft)] text-[var(--text-muted)] hover:text-[var(--brand-accent)] transition-all"
        title="Facebook"
        aria-label="Facebook"
      >
        <Facebook className="w-4 h-4" />
      </button>
      <button
        onClick={copyLink}
        className="p-2 rounded-lg bg-[var(--surface-2)] hover:bg-[var(--success-soft)] text-[var(--text-muted)] hover:text-[var(--success)] transition-all"
        title={t("Common.copy", "Copy link")}
        aria-label={t("Common.copy", "Copy link")}
      >
        {copied ? <CheckCircle2 className="w-4 h-4" /> : <Link2 className="w-4 h-4" />}
      </button>
    </div>
  );
}
