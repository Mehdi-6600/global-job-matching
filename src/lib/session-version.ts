import type { Prisma, PrismaClient } from "@prisma/client";
import { db } from "@/lib/db";

type DbClient = Prisma.TransactionClient | PrismaClient;

/**
 * Bump sessionVersion so all existing JWTs become invalid
 * on the next server-side session refresh.
 */
export async function bumpSessionVersion(
  userId: string,
  client: DbClient = db
): Promise<number> {
  const updated = await client.user.update({
    where: { id: userId },
    data: { sessionVersion: { increment: 1 } },
    select: { sessionVersion: true },
  });
  return updated.sessionVersion;
}

export async function bumpSessionVersionByEmail(
  email: string,
  client: DbClient = db
): Promise<number | null> {
  const user = await client.user.findUnique({
    where: { email: email.toLowerCase().trim() },
    select: { id: true },
  });
  if (!user) return null;
  return bumpSessionVersion(user.id, client);
}
