import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import type { LocationSeoDef } from "@/lib/seo/locations";

const jobCardSelect = {
  id: true,
  title: true,
  location: true,
  remote: true,
  type: true,
  salaryMin: true,
  salaryMax: true,
  currency: true,
  createdAt: true,
  company: {
    select: { id: true, name: true, logo: true },
  },
} satisfies Prisma.JobSelect;

export function locationWhere(
  def: LocationSeoDef
): Prisma.JobWhereInput {
  if (def.remoteOnly) {
    return { status: "active", remote: true };
  }

  const matchers = def.matchers.filter(Boolean);
  if (matchers.length === 0) {
    return { status: "active", id: "__none__" };
  }

  return {
    status: "active",
    OR: matchers.map((m) => ({
      location: { contains: m, mode: "insensitive" as const },
    })),
  };
}

export async function countJobsForLocation(def: LocationSeoDef): Promise<number> {
  try {
    return await db.job.count({ where: locationWhere(def) });
  } catch {
    return 0;
  }
}

export async function listJobsForLocation(
  def: LocationSeoDef,
  take = 24
) {
  try {
    return await db.job.findMany({
      where: locationWhere(def),
      select: jobCardSelect,
      orderBy: { updatedAt: "desc" },
      take,
    });
  } catch {
    return [];
  }
}

export async function listLocationStats(minJobs = 1) {
  const out: Array<{ slug: string; name: string; count: number }> = [];
  for (const def of await import("@/lib/seo/locations").then((m) => m.LOCATION_SEO)) {
    const count = await countJobsForLocation(def);
    if (count >= minJobs) {
      out.push({ slug: def.slug, name: def.name, count });
    }
  }
  return out.sort((a, b) => b.count - a.count);
}
