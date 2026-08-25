"use client";

import { useState } from "react";
import { Twitter, Linkedin, Facebook, Link2, CheckCircle2 } from "lucide-react";

export default function ShareButtons({ title, url }: { title: string; url: string }) {
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
      <span className="text-xs text-slate-500 mr-1">Share:</span>
      <button
        onClick={() => share("twitter")}
        className="p-2 rounded-lg bg-white/5 hover:bg-sky-500/20 text-slate-400 hover:text-sky-400 transition-all"
        title="Twitter"
      >
        <Twitter className="w-4 h-4" />
      </button>
      <button
        onClick={() => share("linkedin")}
        className="p-2 rounded-lg bg-white/5 hover:bg-blue-500/20 text-slate-400 hover:text-blue-400 transition-all"
        title="LinkedIn"
      >
        <Linkedin className="w-4 h-4" />
      </button>
      <button
        onClick={() => share("facebook")}
        className="p-2 rounded-lg bg-white/5 hover:bg-indigo-500/20 text-slate-400 hover:text-indigo-400 transition-all"
        title="Facebook"
      >
        <Facebook className="w-4 h-4" />
      </button>
      <button
        onClick={copyLink}
        className="p-2 rounded-lg bg-white/5 hover:bg-emerald-500/20 text-slate-400 hover:text-emerald-400 transition-all"
        title="Copy link"
      >
        {copied ? <CheckCircle2 className="w-4 h-4" /> : <Link2 className="w-4 h-4" />}
      </button>
    </div>
  );
}
