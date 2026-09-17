/**
 * Interval overlap for job salary vs user filter.
 *
 * Job range:    [salaryMin, salaryMax]  (each end may be null = open)
 * User filter:  [minSalary, maxSalary]  (each end may be omitted = open)
 *
 * Overlap ⇔ NOT (job entirely below userMin OR job entirely above userMax)
 */
export type SalaryBounds = {
  salaryMin?: number | null;
  salaryMax?: number | null;
};

export type SalaryFilter = {
  minSalary?: number | null;
  maxSalary?: number | null;
};

/** Prisma-friendly where clause shape (kept loose to avoid Prisma type import here). */
export type PrismaWhere = Record<string, unknown>;

function toFiniteOrNull(value: number | null | undefined): number | null {
  return value != null && Number.isFinite(value) ? value : null;
}

/**
 * Pure in-memory overlap check.
 * Returns false when the job has no salary data at all (fail closed).
 */
export function salaryRangesOverlap(
  job: SalaryBounds,
  filter: SalaryFilter,
): boolean {
  const userMin = toFiniteOrNull(filter.minSalary);
  const userMax = toFiniteOrNull(filter.maxSalary);

  // No user constraint → everything matches.
  if (userMin == null && userMax == null) return true;

  const jobMin = toFiniteOrNull(job.salaryMin);
  const jobMax = toFiniteOrNull(job.salaryMax);

  // No salary data on job → do not match a salary filter (fail closed).
  if (jobMin == null && jobMax == null) return false;

  // Effective job interval endpoints (open ends → unbounded).
  const lo = jobMin ?? Number.NEGATIVE_INFINITY;
  const hi = jobMax ?? Number.POSITIVE_INFINITY;

  // Job entirely below userMin.
  if (userMin != null && hi < userMin) return false;

  // Job entirely above userMax.
  if (userMax != null && lo > userMax) return false;

  return true;
}

/**
 * Prisma where-clause for the same overlap semantics.
 * Prefer filtering in DB instead of post-query.
 *
 * Returns null when no salary constraint is applied.
 */
export function prismaSalaryOverlapWhere(
  filter: SalaryFilter,
): PrismaWhere | null {
  const userMin = toFiniteOrNull(filter.minSalary);
  const userMax = toFiniteOrNull(filter.maxSalary);

  if (userMin == null && userMax == null) return null;

  const clauses: PrismaWhere[] = [];

  // Must have at least one salary bound on the job.
  clauses.push({
    OR: [{ salaryMin: { not: null } }, { salaryMax: { not: null } }],
  });

  // Job not entirely below userMin:
  //   salaryMax >= userMin  OR  salaryMax is null (open upper bound).
  if (userMin != null) {
    clauses.push({
      OR: [
        { salaryMax: { gte: userMin } },
        { salaryMax: null },
      ],
    });
  }

  // Job not entirely above userMax:
  //   salaryMin <= userMax  OR  salaryMin is null (open lower bound).
  if (userMax != null) {
    clauses.push({
      OR: [
        { salaryMin: { lte: userMax } },
        { salaryMin: null },
      ],
    });
  }

  return { AND: clauses };
}
