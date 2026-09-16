"use client";

import { locales, localeLabels, type Locale } from "@/lib/i18n/config";
import { useLocale } from "@/components/locale-provider";
import { Globe } from "lucide-react";

export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { locale, setLocale } = useLocale();

  return (
    <label className="gjm-lang-switcher">
      <Globe className="gjm-lang-icon" aria-hidden />
      <select
        value={locale}
        onChange={(e) => setLocale(e.target.value as Locale)}
        aria-label="Language"
        className={`gjm-lang-select ${compact ? "is-compact" : ""}`}
      >
        {locales.map((code) => (
          <option key={code} value={code}>
            {compact ? code.toUpperCase() : localeLabels[code]}
          </option>
        ))}
      </select>
    </label>
  );
}
