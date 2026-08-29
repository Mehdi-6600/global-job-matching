export const locales = ["en", "es", "ar", "fa", "hi", "fr"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "en";

export const localeLabels: Record<Locale, string> = {
  en: "English",
  es: "Español",
  ar: "العربية",
  fa: "فارسی",
  hi: "हिन्दी",
  fr: "Français",
};

export const rtlLocales: Locale[] = ["ar", "fa"];

export function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}
