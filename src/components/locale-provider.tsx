"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import {
  defaultLocale,
  isLocale,
  isRtlLocale,
  LOCALE_COOKIE,
  LOCALE_STORAGE_KEY,
  type Locale,
} from "@/lib/i18n/config";
import { getDictionary, t, type Dictionary } from "@/lib/i18n/get-dictionary";
import { resolveLocale } from "@/lib/i18n/resolve-locale";

type LocaleContextValue = {
  locale: Locale;
  dict: Dictionary;
  setLocale: (locale: Locale) => void;
  t: (key: string, fallback?: string) => string;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

function writeLocaleCookie(locale: Locale) {
  try {
    document.cookie = `${LOCALE_COOKIE}=${locale};path=/;max-age=31536000;samesite=lax`;
  } catch {
    // ignore
  }
}

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [locale, setLocaleState] = useState<Locale>(defaultLocale);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(LOCALE_STORAGE_KEY);
      setLocaleState(resolveLocale(saved));
    } catch {
      setLocaleState(defaultLocale);
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    document.documentElement.lang = locale;
    document.documentElement.dir = isRtlLocale(locale) ? "rtl" : "ltr";
    try {
      localStorage.setItem(LOCALE_STORAGE_KEY, locale);
    } catch {
      // ignore
    }
    writeLocaleCookie(locale);
  }, [locale, ready]);

  const setLocale = useCallback(
    (next: Locale) => {
      if (!isLocale(next)) return;
      setLocaleState(next);
      writeLocaleCookie(next);
      try {
        localStorage.setItem(LOCALE_STORAGE_KEY, next);
      } catch {
        // ignore
      }
      document.documentElement.lang = next;
      document.documentElement.dir = isRtlLocale(next) ? "rtl" : "ltr";
      // Refresh Server Components so they read the new cookie
      router.refresh();
    },
    [router]
  );

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
