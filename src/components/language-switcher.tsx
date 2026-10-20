"use client";

import { locales, localeLabels, type Locale } from "@/lib/i18n/config";
import { useLocale } from "@/components/locale-provider";

/**
 * Language switcher — native <select> for keyboard + screen-reader support,
 * styled with semantic tokens. `compact` shows ISO codes (mobile header).
 */
export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { locale, setLocale, t } = useLocale();

  return (
    <label className="group relative inline-flex items-center">
      <span className="sr-only">{t("Nav.language", "Language")}</span>
      <select
        value={locale}
        onChange={(event) => setLocale(event.target.value as Locale)}
        aria-label={t("Nav.language", "Language")}
        className={[
          "h-10 cursor-pointer rounded-[var(--radius-md)] border border-transparent bg-transparent ps-1",
          "pe-1 text-[0.8125rem] font-medium text-[var(--text-body)]",
          "transition-colors duration-200 hover:border-[var(--border-soft)] hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]",
          compact ? "w-[5.25rem]" : "max-w-[11rem]",
        ].join(" ")}
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
