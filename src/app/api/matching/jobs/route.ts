import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ratelimit } from "@/lib/ratelimit";
import { getRequestIp } from "@/lib/client-ip";
import { computeMatchScore } from "@/lib/matching/score";
import { normalizeLocation } from "@/lib/location";

/* ------------------------------------------------------------------ */
/* Constants                                                          */
/* ------------------------------------------------------------------ */

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;
const MIN_LIMIT = 1;

const DEFAULT_MIN_SCORE = 0;
const MAX_MIN_SCORE = 100;
const MIN_MIN_SCORE = 0;

/** Upper bound of jobs fetched before ranking (deterministic order). */
const CANDIDATE_POOL_SIZE = 120;

const RATELIMIT_KEY_PREFIX = "match_jobs";

/* ------------------------------------------------------------------ */
/* Helpers                                                            */
/* ------------------------------------------------------------------ */

/**
 * Parse a bounded integer from a query param.
 * Returns `fallback` when the value is missing, non-numeric, or NaN.
 */
function parseIntParam(
  value: string | null,
  { min, max, fallback }: { min: number; max: number; fallback: number },
): number {
  if (value == null) return fallback;
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  const truncated = Math.trunc(n);
  return Math.min(max, Math.max(min, truncated));
}

/**
 * Build a stable, non-PII ratelimit key from user id + IP.
 */
function buildRateLimitKey(userId: string, ip: string): string {
  return `${RATELIMIT_KEY_PREFIX}_${userId}_${ip}`;
}

/**
 * Detect whether the profile has enough signal to compute a meaningful match.
 * We accept any of: skills, bio, experience, or title.
 */
function hasProfileSignal(profile: {
  skills?: string | null;
  bio?: string | null;
  experience?: string | null;
  title?: string | null;
} | null): boolean {
  if (!profile) return false;
  return (
    Boolean(profile.skills?.trim()) ||
    Boolean(profile.bio?.trim()) ||
    Boolean(profile.experience?.trim()) ||
    Boolean(profile.title?.trim())
  );
}

/* ------------------------------------------------------------------ */
/* Route handler                                                      */
/* ------------------------------------------------------------------ */

/**
 * Personalized job feed with match %.
 *
 * GET /api/matching/jobs?limit=20&minScore=40
 *
 * Query params:
 *   - limit    (1..50, default 20)  — max number of jobs returned
 *   - minScore (0..100, default 0)  — minimum match score filter
 *
 * Responses:
 *   - 200: { jobs, profileComplete: true,  count }  — success
 *   - 200: { jobs: [], message, profileComplete: false, count: 0 } — incomplete profile
 *   - 401: Unauthorized
 *   - 429: Too many requests
 *   - 500: Failed
 */
export async function GET(req: NextRequest) {
  try {
    /* -------- Auth -------- */
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    /* -------- Rate limit -------- */
    const ip = getRequestIp(req);
    const { success } = await ratelimit.limit(
      buildRateLimitKey(session.user.id, ip),
    );
    if (!success) {
      return NextResponse.json(
        { error: "Too many requests" },
        { status: 429 },
      );
    }

    /* -------- Query params -------- */
    const { searchParams } = new URL(req.url);
    const limit = parseIntParam(searchParams.get("limit"), {
      min: MIN_LIMIT,
      max: MAX_LIMIT,
      fallback: DEFAULT_LIMIT,
    });
    const minScore = parseIntParam(searchParams.get("minScore"), {
      min: MIN_MIN_SCORE,
      max: MAX_MIN_SCORE,
      fallback: DEFAULT_MIN_SCORE,
    });

    /* -------- Profile -------- */
    const profile = await db.profile.findUnique({
      where: { userId: session.user.id },
      select: {
        skills: true,
        title: true,       // needed for titleBoost in computeMatchScore
        bio: true,
        experience: true,
        education: true,
        location: true,
      },
    });

    if (!hasProfileSignal(profile)) {
      return NextResponse.json({
        jobs: [],
        message:
          "Complete your profile (skills/bio) to see personalized match scores.",
        profileComplete: false,
        count: 0,
      });
    }

    /* -------- Candidate jobs -------- */
    const jobs = await db.job.findMany({
      where: { status: "active" },
      orderBy: { createdAt: "desc" },
      take: CANDIDATE_POOL_SIZE,
      select: {
        id: true,
        title: true,
        description: true,
        location: true,
        remote: true,
        experience: true,
        requirements: true,
        tags: true,
        type: true,
        salary: true,
        salaryMin: true,
        salaryMax: true,
        company: {
          select: { id: true, name: true, logo: true },
        },
      },
    });

    /* -------- Rank -------- */
    const ranked = jobs
      .map((job) => {
        const match = computeMatchScore(profile, {
          title: job.title,
          description: job.description,
          location: job.location,
          remote: job.remote,
          experience: job.experience,
          requirements: job.requirements,
          tags: job.tags,
          type: job.type,
        });

        return {
          id: job.id,
          title: job.title,
          location: normalizeLocation(job.location) || job.location,
          remote: job.remote,
          type: job.type,
          salary: job.salary,
          salaryMin: job.salaryMin,
          salaryMax: job.salaryMax,
          company: job.company,
          match,
        };
      })
      .filter((j) => j.match.score >= minScore)
      .sort((a, b) => {
        // Primary: higher score first.
        if (b.match.score !== a.match.score) {
          return b.match.score - a.match.score;
        }
        // Secondary: stable tie-break by id (deterministic order).
        return a.id.localeCompare(b.id);
      })
      .slice(0, limit);

    /* -------- Response -------- */
    return NextResponse.json({
      jobs: ranked,
      profileComplete: true,
      count: ranked.length,
    });
  } catch (error) {
    console.error("Matching jobs error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
