import type { Prisma, PrismaClient } from "@prisma/client";

type Tx = Prisma.TransactionClient | PrismaClient;

/**
 * Ensures the employer has at least one company.
 * Call only after lockUserRow() so concurrent creates don't duplicate.
 */
export async function ensureDefaultCompany(
  tx: Tx,
  params: {
    ownerId: string;
    email?: string | null;
    preferredName?: string | null;
    companyId?: string | null;
    isAdmin?: boolean;
  }
): Promise<
  | { ok: true; companyId: string }
  | { ok: false; status: number; error: string }
> {
  if (params.companyId) {
    const company = await tx.company.findUnique({
      where: { id: params.companyId },
      select: { id: true, ownerId: true, status: true },
    });

    if (!company) {
      return { ok: false, status: 404, error: "Company not found" };
    }

    if (!params.isAdmin && company.ownerId !== params.ownerId) {
      return {
        ok: false,
        status: 403,
        error: "You do not own this company",
      };
    }

    return { ok: true, companyId: company.id };
  }

  const existing = await tx.company.findFirst({
    where: { ownerId: params.ownerId },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });

  if (existing) {
    return { ok: true, companyId: existing.id };
  }

  const name =
    (params.preferredName && params.preferredName.trim()) || "My Company";

  const created = await tx.company.create({
    data: {
      name,
      ownerId: params.ownerId,
      email: params.email || null,
      status: "active",
    },
    select: { id: true },
  });

  return { ok: true, companyId: created.id };
}
