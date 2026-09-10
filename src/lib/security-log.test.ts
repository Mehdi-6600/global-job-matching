import { describe, it, expect, vi, afterEach } from "vitest";
import { securityLog } from "./security-log";

describe("securityLog", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("writes structured JSON to console.info", () => {
    const spy = vi.spyOn(console, "info").mockImplementation(() => {});
    securityLog("admin.role_change", {
      actorId: "a1",
      targetId: "u1",
      meta: { role: "EMPLOYER" },
    });
    expect(spy).toHaveBeenCalledTimes(1);
    const arg = spy.mock.calls[0]?.[1] as string;
    const parsed = JSON.parse(arg);
    expect(parsed.type).toBe("admin.role_change");
    expect(parsed.actorId).toBe("a1");
    expect(parsed.targetId).toBe("u1");
    expect(parsed.meta.role).toBe("EMPLOYER");
    expect(typeof parsed.at).toBe("string");
  });
});
