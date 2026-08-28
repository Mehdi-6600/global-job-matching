/**
 * Single database client — re-export of db.
 * Prefer: import { db } from "@/lib/db"
 * Legacy: import { prisma } from "@/lib/prisma" (same client)
 */
export { db as prisma, db } from "@/lib/db";
