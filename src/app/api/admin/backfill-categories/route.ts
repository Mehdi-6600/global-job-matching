import { NextResponse } from "next/server";

/**
 * Emergency disable. This endpoint is intentionally unavailable.
 *
 * Every method returns 404 immediately: no request parsing, no credential
 * check, no database access. The file is kept (not deleted) so the path
 * stays a 404 and the change is a single-file revert.
 *
 * Do not re-enable without an owner-only design and a categorization source
 * that is unified with src/lib/jobs/ingestion/categorize.ts.
 */
function notFound() {
  return NextResponse.json({ error: "not_found" }, { status: 404 });
}

export async function GET() {
  return notFound();
}

export async function POST() {
  return notFound();
}

export async function PUT() {
  return notFound();
}

export async function PATCH() {
  return notFound();
}

export async function DELETE() {
  return notFound();
}

export async function HEAD() {
  return notFound();
}

export async function OPTIONS() {
  return notFound();
}
