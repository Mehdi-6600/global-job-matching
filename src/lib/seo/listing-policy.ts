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
  const path = pathname.replace(/\/$/, "") || "/";
  return (LISTING_PATHS_NOINDEX_QUERY as readonly string[]).includes(path);
}

/** True if URL has any non-empty query value */
export function urlHasIndexableQueryNoise(searchParams: URLSearchParams): boolean {
  for (const [, value] of searchParams.entries()) {
    if (String(value || "").trim() !== "") return true;
  }
  return false;
}
