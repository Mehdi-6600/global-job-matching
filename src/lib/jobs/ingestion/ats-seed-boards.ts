/**
 * ATS seed board list.
 *
 * These are boards the operator may want to review. Presence here does
 * NOT grant ingestion rights: seeding only creates SourceCompany rows
 * with legalStatus="UNKNOWN", robotsStatus="unknown", termsStatus="unknown",
 * and status="discovered". A human must review and explicitly flip each
 * row to APPROVED/allowed/active before the adapter will fetch it.
 *
 * Format: { provider, boardIdentifier, companyName, country? }
 *
 * Keep this list short and curated. Adding hundreds of entries here is
 * an invitation to accidentally ingest boards you have never reviewed.
 * The intended workflow is:
 *   1. Operator adds a candidate here.
 *   2. Operator runs the discovery action (admin endpoint).
 *   3. Operator reviews terms/robots for the board.
 *   4. Operator updates SourceCompany row -> APPROVED/allowed/active.
 *   5. Adapter picks it up on the next sync.
 */
import type { AtsProvider } from "./ats-discovery";

export type SeedBoard = {
  provider: AtsProvider;
  boardIdentifier: string;
  companyName: string;
  country?: string;
  language?: string;
};

/**
 * Seed list — deliberately minimal.
 *
 * These are well-known public ATS boards used for smoke-testing the
 * discovery pipeline. They still require explicit legal review before
 * activation. Do NOT treat this list as an approval.
 */
export const ATS_SEED_BOARDS: SeedBoard[] = [
  /* ---- Greenhouse (provider enabled 2026-09-24) ---------------- */
  {
    provider: "greenhouse",
    boardIdentifier: "airbnb",
    companyName: "Airbnb",
    language: "en",
  },
  {
    provider: "greenhouse",
    boardIdentifier: "stripe",
    companyName: "Stripe",
    language: "en",
  },
  {
    provider: "greenhouse",
    boardIdentifier: "figma",
    companyName: "Figma",
    language: "en",
  },
  {
    provider: "greenhouse",
    boardIdentifier: "notion",
    companyName: "Notion",
    language: "en",
  },
  {
    provider: "greenhouse",
    boardIdentifier: "coinbase",
    companyName: "Coinbase",
    language: "en",
  },
  {
    provider: "greenhouse",
    boardIdentifier: "discord",
    companyName: "Discord",
    language: "en",
  },
  {
    provider: "greenhouse",
    boardIdentifier: "reddit",
    companyName: "Reddit",
    language: "en",
  },

  /* ---- Lever (provider DISABLED — pending ToS review) ---------- */
  {
    provider: "lever",
    boardIdentifier: "netflix",
    companyName: "Netflix",
    language: "en",
  },

  /* ---- Ashby (provider DISABLED — pending ToS review) ---------- */
  {
    provider: "ashby",
    boardIdentifier: "openai",
    companyName: "OpenAI",
    language: "en",
  },
];
