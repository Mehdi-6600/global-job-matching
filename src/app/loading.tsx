import { cookies } from "next/headers";
import { LOCALE_COOKIE } from "@/lib/i18n/config";
import { resolveLocale } from "@/lib/i18n/resolve-locale";
import { getDictionary, t } from "@/lib/i18n/get-dictionary";

/**
 * Route-level loading state.
 *
 * A skeleton, not a spinner: the shapes mirror the job grid so the transition
 * into real content does not shift the page. The only text is the screen-reader
 * status message, which is resolved from the locale cookie so it is announced
 * in the reader's own language.
 */
export default async function Loading() {
  const cookieStore = await cookies();
  const locale = resolveLocale(cookieStore.get(LOCALE_COOKIE)?.value);
  const dict = getDictionary(locale);

  return (
    <div className="gjm-page" aria-busy="true" aria-live="polite">
      <div className="gjm-container">
        <span className="sr-only">{t(dict, "Common.loading", "Loading…")}</span>
        <div className="h-4 w-28 animate-pulse rounded bg-[var(--surface-2)]" />
        <div className="mt-3 h-9 w-3/4 max-w-md animate-pulse rounded bg-[var(--surface-2)]" />
        <div className="mt-2 h-4 w-2/3 max-w-sm animate-pulse rounded bg-[var(--surface-2)]" />
        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="rounded-[var(--radius-xl)] border border-[var(--border-soft)] bg-[var(--surface)] p-5"
            >
              <div className="flex items-center gap-3">
                <span className="h-11 w-11 animate-pulse rounded-[var(--radius-md)] bg-[var(--surface-2)]" />
                <span className="flex-1 space-y-2">
                  <span className="block h-3.5 w-3/4 animate-pulse rounded bg-[var(--surface-2)]" />
                  <span className="block h-2.5 w-1/2 animate-pulse rounded bg-[var(--surface-2)]" />
                </span>
              </div>
              <div className="mt-4 h-16 animate-pulse rounded-[var(--radius-md)] bg-[var(--surface-2)]" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
