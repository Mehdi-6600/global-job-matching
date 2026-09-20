# Job Source Adapters — Onboarding Guide

This directory contains **source adapters** for the ingestion pipeline.

An adapter is a small, focused module that knows how to:

1. Fetch a page of jobs from ONE external source.
2. Normalize each job into an `IngestJobDraft`.
3. Report pagination state (`hasMore`, `nextCursor`).

Everything else — quality gate, dedup, fingerprint, provenance, freshness,
persistence — is handled by the **central pipeline** (`../pipeline.ts`).
Adapters never touch the database.

---

## Pipeline flow

1. **External source** — an API, JSON feed, RSS, or permitted HTML page.
2. **Adapter** (this folder) — you write this. It fetches a page and
   returns normalized `IngestJobDraft` objects.
3. **Central Pipeline** — `../pipeline.ts` runs the quality gate, dedup,
   fingerprint, provenance, freshness, and persistence.
4. **PostgreSQL** — imported jobs are stored with `postedById = null`.

Adapters never write to the database. The pipeline is the single
authority for persistence.

---

## Adding a new source — 4 steps

### 1. Create the adapter file

Copy `_template.ts` to `<sourceKey>.ts` and fill in the TODOs.

Example (`hackernews.ts`):

```ts
import type {
  AdapterFetchOptions,
  AdapterFetchResult,
  IngestJobDraft,
  JobSourceAdapter,
} from "../types";
import { fetchWithRetry } from "../http";
import { tryAcquireSourceQuota } from "../rate-limit";
import { normalizeJobUrl } from "../url";

const API = "https://news.ycombinator.com/api/jobs";

export const hackernewsAdapter: JobSourceAdapter = {
  key: "hackernews",
  async fetchPage(
    options: AdapterFetchOptions = {},
  ): Promise<AdapterFetchResult> {
    const cfg = options.sourceConfig;
    const rateLimit = cfg?.rateLimitPerMinute ?? 30;
    const timeoutMs = cfg?.httpConfig?.timeoutMs ?? 12_000;
    const maxAttempts = cfg?.httpConfig?.maxAttempts ?? 3;

    if (!tryAcquireSourceQuota("hackernews", rateLimit)) {
      return {
        jobs: [],
        hasMore: false,
        fetched: 0,
        errors: ["rate_limited"],
      };
    }

    const page = options.page ?? 1;
    const url = new URL(API);
    url.searchParams.set("page", String(page));

    const res = await fetchWithRetry(url.toString(), {
      signal: options.signal,
      timeoutMs,
      maxAttempts,
    });

    if (!res.ok) {
      return {
        jobs: [],
        hasMore: false,
        fetched: 0,
        errors: [res.error || `http_${res.status}`],
      };
    }

    let raw: unknown;
    try {
      raw = JSON.parse(res.body);
    } catch {
      return {
        jobs: [],
        hasMore: false,
        fetched: 0,
        errors: ["malformed_json"],
      };
    }

    const items = Array.isArray(raw) ? raw : [];
    const jobs = items
      .map((item) => mapItem(item))
      .filter((j): j is IngestJobDraft => j !== null);

    return {
      jobs,
      hasMore: items.length > 0,
      fetched: items.length,
      errors: [],
      nextCursor: null,
    };
  },
};
