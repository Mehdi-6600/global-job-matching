"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { usePathname, useRouter } from "next/navigation";
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
import { writeLocaleCookie } from "@/lib/i18n/cookie";
import {
  localizePath,
  parseLocalePath,
  stripLocaleFromPathname,
} from "@/lib/i18n/locale-path";

type LocaleContextValue = {
  locale: Locale;
  dict: Dictionary;
  setLocale: (locale: Locale) => void;
  t: (key: string, fallback?: string) => string;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname() || "/";
  const [locale, setLocaleState] = useState<Locale>(defaultLocale);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const fromPath = parseLocalePath(pathname).localeFromPath;
    try {
      const saved = localStorage.getItem(LOCALE_STORAGE_KEY);
      setLocaleState(resolveLocale(fromPath || saved));
    } catch {
      setLocaleState(resolveLocale(fromPath));
    }
    setReady(true);
  }, [pathname]);

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

      const bare = stripLocaleFromPathname(pathname);
      const nextPath = localizePath(bare, next);
      const search = typeof window !== "undefined" ? window.location.search : "";
      router.push(`${nextPath}${search}`);
      router.refresh();
    },
    [router, pathname]
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
