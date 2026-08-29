"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  defaultLocale,
  isLocale,
  rtlLocales,
  type Locale,
} from "@/lib/i18n/config";
import { getDictionary, t, type Dictionary } from "@/lib/i18n/get-dictionary";

type LocaleContextValue = {
  locale: Locale;
  dict: Dictionary;
  setLocale: (locale: Locale) => void;
  t: (key: string, fallback?: string) => string;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

const STORAGE_KEY = "gjm_locale";

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(defaultLocale);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved && isLocale(saved)) {
        setLocaleState(saved);
      }
    } catch {
      // ignore
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    document.documentElement.lang = locale;
    document.documentElement.dir = rtlLocales.includes(locale) ? "rtl" : "ltr";
    try {
      localStorage.setItem(STORAGE_KEY, locale);
      document.cookie = `NEXT_LOCALE=${locale};path=/;max-age=31536000;samesite=lax`;
    } catch {
      // ignore
    }
  }, [locale, ready]);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
  }, []);

  const dict = useMemo(() => getDictionary(locale), [locale]);

  const translate = useCallback(
    (key: string, fallback?: string) => t(dict, key, fallback),
    [dict]
  );

  const value = useMemo(
    () => ({ locale, dict, setLocale, t: translate }),
    [locale, dict, setLocale, translate]
  );

  return (
    <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
  );
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    throw new Error("useLocale must be used within LocaleProvider");
  }
  return ctx;
}
