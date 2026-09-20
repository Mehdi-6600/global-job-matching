/**
 * Legal gate tests — fail-closed enforcement.
 *
 * The gate must reject any source that is not explicitly enabled,
 * APPROVED, robots-allowed, and terms-allowed. UNKNOWN or missing
 * policy metadata is NEVER treated as permissive.
 */
import { describe, it, expect } from "vitest";
import {
  isProductionIngestAllowed,
  ingestBlockReason,
  SOURCE_REGISTRY,
} from "./registry";

/* ------------------------------------------------------------------ */
/* Helpers                                                            */
/* ------------------------------------------------------------------ */

type GateInput = Parameters<typeof isProductionIngestAllowed>[0];

function entry(patch: Partial<GateInput> = {}): GateInput {
  return {
    enabled: true,
    licenseStatus: "APPROVED",
    robotsStatus: "allowed",
    termsStatus: "allowed",
    ...patch,
  };
}

/* ------------------------------------------------------------------ */
/* isProductionIngestAllowed                                          */
/* ------------------------------------------------------------------ */

describe("isProductionIngestAllowed — fail-closed", () => {
  it("allows only when every gate is explicitly satisfied", () => {
    expect(isProductionIngestAllowed(entry())).toBe(true);
  });

  it("blocks when disabled", () => {
    expect(isProductionIngestAllowed(entry({ enabled: false }))).toBe(false);
  });

  it("blocks when licenseStatus is not APPROVED", () => {
    expect(
      isProductionIngestAllowed(entry({ licenseStatus: "UNKNOWN" })),
    ).toBe(false);
    expect(
      isProductionIngestAllowed(entry({ licenseStatus: "NEEDS_PERMISSION" })),
    ).toBe(false);
    expect(
      isProductionIngestAllowed(entry({ licenseStatus: "RESTRICTED" })),
    ).toBe(false);
    expect(
      isProductionIngestAllowed(entry({ licenseStatus: "DISABLED" })),
    ).toBe(false);
  });

  it("blocks when robotsStatus is missing", () => {
    const e = entry();
    delete (e as { robotsStatus?: unknown }).robotsStatus;
    expect(isProductionIngestAllowed(e)).toBe(false);
  });

  it("blocks when robotsStatus is 'unknown'", () => {
    expect(isProductionIngestAllowed(entry({ robotsStatus: "unknown" }))).toBe(
      false,
    );
  });

  it("blocks when robotsStatus is 'disallowed'", () => {
    expect(
      isProductionIngestAllowed(entry({ robotsStatus: "disallowed" })),
    ).toBe(false);
  });

  it("blocks when termsStatus is missing", () => {
    const e = entry();
    delete (e as { termsStatus?: unknown }).termsStatus;
    expect(isProductionIngestAllowed(e)).toBe(false);
  });

  it("blocks when termsStatus is 'unknown'", () => {
    expect(isProductionIngestAllowed(entry({ termsStatus: "unknown" }))).toBe(
      false,
    );
  });

  it("blocks when termsStatus is 'restricted'", () => {
    expect(
      isProductionIngestAllowed(entry({ termsStatus: "restricted" })),
    ).toBe(false);
  });
});

/* ------------------------------------------------------------------ */
/* ingestBlockReason                                                  */
/* ------------------------------------------------------------------ */

describe("ingestBlockReason — stable error codes", () => {
  it("returns null when allowed", () => {
    expect(ingestBlockReason(entry())).toBeNull();
  });

  it("returns source_disabled when disabled", () => {
    expect(ingestBlockReason(entry({ enabled: false }))).toBe(
      "source_disabled",
    );
  });

  it("returns license_blocked:<status> when license is not APPROVED", () => {
    expect(
      ingestBlockReason(entry({ licenseStatus: "UNKNOWN" })),
    ).toBe("license_blocked:UNKNOWN");
    expect(
      ingestBlockReason(entry({ licenseStatus: "RESTRICTED" })),
    ).toBe("license_blocked:RESTRICTED");
  });

  it("returns robots_blocked:missing when robotsStatus is undefined", () => {
    const e = entry();
    delete (e as { robotsStatus?: unknown }).robotsStatus;
    expect(ingestBlockReason(e)).toBe("robots_blocked:missing");
  });

  it("returns robots_blocked:unknown when robotsStatus is 'unknown'", () => {
    expect(ingestBlockReason(entry({ robotsStatus: "unknown" }))).toBe(
      "robots_blocked:unknown",
    );
  });

  it("returns robots_blocked:disallowed when robotsStatus is 'disallowed'", () => {
    expect(ingestBlockReason(entry({ robotsStatus: "disallowed" }))).toBe(
      "robots_blocked:disallowed",
    );
  });

  it("returns terms_blocked:missing when termsStatus is undefined", () => {
    const e = entry();
    delete (e as { termsStatus?: unknown }).termsStatus;
    expect(ingestBlockReason(e)).toBe("terms_blocked:missing");
  });

  it("returns terms_blocked:restricted when termsStatus is 'restricted'", () => {
    expect(ingestBlockReason(entry({ termsStatus: "restricted" }))).toBe(
      "terms_blocked:restricted",
    );
  });
});

/* ------------------------------------------------------------------ */
/* Registry sanity                                                    */
/* ------------------------------------------------------------------ */

describe("SOURCE_REGISTRY — arbeitnow still runnable", () => {
  it("arbeitnow is explicitly allowed", () => {
    const entry = SOURCE_REGISTRY.find((s) => s.key === "arbeitnow");
    expect(entry).toBeDefined();
    expect(entry!.robotsStatus).toBe("allowed");
    expect(entry!.termsStatus).toBe("allowed");
    expect(entry!.licenseStatus).toBe("APPROVED");
    expect(entry!.enabled).toBe(true);
    expect(isProductionIngestAllowed(entry!)).toBe(true);
  });
});
