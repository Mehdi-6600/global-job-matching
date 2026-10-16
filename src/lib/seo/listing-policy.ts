import { stripLocaleFromPathname } from "@/lib/i18n/locale-path";

/**
 * Public listing paths where query-string variants should not be indexed.
 * Canonical HTML stays on the clean path (see layouts).
 * Middleware adds X-Robots-Tag: noindex, follow when a query string is present.
 */
export const LISTING_PATHS_NOINDEX_QUERY = [
  "/jobs",
  "/search",
  "/companies",
  "/locations",
  "/categories",
  "/blog",
] as const;

export function pathShouldNoindexWhenQueried(pathname: string): boolean {
  const path = stripLocaleFromPathname(pathname).replace(/\/$/, "") || "/";
  return (LISTING_PATHS_NOINDEX_QUERY as readonly string[]).includes(path);
}

/** True when a listing URL should be noindexed: a listing path with an indexable query. */
export function shouldNoindexListingUrl(
  pathname: string,
  search: string | URLSearchParams
): boolean {
  const params =
    typeof search === "string"
      ? new URLSearchParams(search.replace(/^\?/, ""))
      : search;
  return (
    pathShouldNoindexWhenQueried(pathname) && urlHasIndexableQueryNoise(params)
  );
}

/** True for paths that are public listing pages (the set that gets query-noise rules). */
export function isPublicListingPath(pathname: string): boolean {
  return pathShouldNoindexWhenQueried(pathname);
}

/** True if URL has any non-empty query value */
export function urlHasIndexableQueryNoise(
  searchParams: URLSearchParams
): boolean {
  for (const [, value] of searchParams.entries()) {
    if (String(value || "").trim() !== "") return true;
  }
  return false;
}
