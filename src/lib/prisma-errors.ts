/**
 * Helpers to classify Prisma errors without importing @prisma/client/runtime
 * (keeps Edge/server bundles simpler).
 */

export function isPrismaError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const name = String((error as { name?: string }).name || "");
  const code = String((error as { code?: string }).code || "");
  return (
    name.includes("Prisma") ||
    code.startsWith("P") ||
    "clientVersion" in (error as object)
  );
}

export function prismaErrorCode(error: unknown): string | null {
  if (!error || typeof error !== "object") return null;
  const code = (error as { code?: unknown }).code;
  return typeof code === "string" ? code : null;
}

/** Table/column missing, or record not found — treat as soft miss for public GETs */
export function isPrismaNotFoundLike(error: unknown): boolean {
  const code = prismaErrorCode(error);
  return (
    code === "P2025" || // Record not found
    code === "P2021" || // Table does not exist
    code === "P2022" // Column does not exist
  );
}
