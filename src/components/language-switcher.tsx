"use client";

import { locales, localeLabels, type Locale } from "@/lib/i18n/config";
import { useLocale } from "@/components/locale-provider";
import { Globe } from "lucide-react";

export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { locale, setLocale } = useLocale();

  return (
    <label className="relative inline-flex items-center gap-1.5 text-slate-300">
      <Globe className="w-4 h-4 shrink-0 opacity-70" aria-hidden />
      <select
        value={locale}
        onChange={(e) => setLocale(e.target.value as Locale)}
        aria-label="Language"
        className={`bg-white/5 border border-white/10 rounded-lg text-xs text-slate-200 outline-none focus:border-sky-500/50 cursor-pointer ${
          compact ? "py-1 pl-1 pr-1 max-w-[4.5rem]" : "py-1.5 pl-2 pr-6"
        }`}
      >
        {locales.map((code) => (
          <option key={code} value={code} className="bg-slate-900 text-white">
            {compact ? code.toUpperCase() : localeLabels[code]}
          </option>
        ))}
      </select>
    </label>
  );
}
