import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/authz";
import {
  SOURCE_REGISTRY,
  isProductionIngestAllowed,
} from "@/lib/jobs/ingestion/registry";

/**
 * GET /api/admin/sync/sources
 *
 * Returns the list of sources the admin UI can trigger manually.
 * Includes both enabled and disabled sources so the UI can render
 * disabled ones (greyed out) without a separate endpoint.
 *
 * Only sources with an adapter are returned (i.e. real, registered
 * sources). Unknown registry entries are skipped.
 */
export async function GET(_req: NextRequest) {
  try {
    const authz = await requireAdmin();
    if (!authz.ok) return authz.response;

    const sources = SOURCE_REGISTRY.filter((s) => s.adapter).map((s) => ({
      key: s.key,
      name: s.name,
      type: s.type,
      enabled: s.enabled,
      runnable: isProductionIngestAllowed(s),
      licenseStatus: s.licenseStatus,
    }));

    return NextResponse.json({ sources });
  } catch (error) {
    console.error("Sync sources list error:", error);
    return NextResponse.json(
      { error: "Failed to load sources" },
      { status: 500 },
    );
  }
}
