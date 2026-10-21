import { describe, expect, it } from "vitest";
import { authConfig } from "@/lib/auth.config";

/**
 * Exercises the real `authorized` callback used by the middleware.
 * Returns `true` (allow), or a Response redirect.
 */
type AuthorizedCallback = (args: {
  auth: unknown;
  request: { nextUrl: unknown };
}) => true | Response;

function run(
  url: string,
  user: { id?: string; role?: string } | null,
  sessionError?: string,
): true | Response {
  const authorized = authConfig.callbacks.authorized as unknown as AuthorizedCallback;
  const auth =
    user || sessionError
      ? {
          user: user ?? { id: "", role: "" },
          expires: "",
          error: sessionError,
        }
      : null;

  return authorized({
    auth,
    request: { nextUrl: new URL(url, "https://example.test") },
  });
}

function redirectTarget(result: true | Response): string | null {
  if (result === true) return null;
  return result.headers.get("location");
}

describe("authorized callback — guests", () => {
  it.each([
    "/",
    "/jobs",
    "/fa/jobs",
    "/de/pricing",
    "/fa",
    "/jobs/abc123",
    "/companies/cmp1",
    "/career-risk/share/tok",
  ])("allows public page %s without redirect", (url) => {
    expect(run(url, null)).toBe(true);
  });

  it.each(["/dashboard", "/fa/dashboard", "/admin", "/employer/post-job", "/settings"])(
    "redirects private page %s to login with callbackUrl preserved",
    (url) => {
      const result = run(url, null);
      const location = redirectTarget(result);
      expect(location).not.toBeNull();
      const target = new URL(location!, "https://example.test");
      expect(target.pathname).toBe("/login");
      expect(target.searchParams.get("callbackUrl")).toBe(url);
    },
  );

  it("lets unknown URLs reach Next.js (404) instead of login", () => {
    expect(run("/this-page-does-not-exist", null)).toBe(true);
    expect(run("/fa/this-page-does-not-exist", null)).toBe(true);
  });

  it("allows login and register pages", () => {
    expect(run("/login", null)).toBe(true);
    expect(run("/fa/register", null)).toBe(true);
  });

  it("does not create a redirect loop for an invalidated session on login", () => {
    expect(run("/login?error=SessionExpired", null, "SessionInvalidated")).toBe(
      true,
    );
    expect(run("/fa/register", null, "SessionInvalidated")).toBe(true);
  });

  it("sends an invalidated session to login with a retryable callback", () => {
    const result = run("/dashboard", null, "SessionInvalidated");
    const location = redirectTarget(result);
    expect(location).not.toBeNull();

    const target = new URL(location!, "https://example.test");
    expect(target.pathname).toBe("/login");
    expect(target.searchParams.get("error")).toBe("SessionExpired");
    expect(target.searchParams.get("callbackUrl")).toBe("/dashboard");
  });
});

describe("authorized callback — signed-in users", () => {
  const seeker = { id: "u1", role: "JOB_SEEKER" };

  it("sends signed-in users away from auth pages (including prefixed)", () => {
    expect(redirectTarget(run("/login", seeker))).toBe("https://example.test/dashboard");
    expect(redirectTarget(run("/fa/login", seeker))).toBe("https://example.test/dashboard");
  });

  it("denies admin pages to non-admin roles", () => {
    expect(redirectTarget(run("/admin", seeker))).toBe("https://example.test/dashboard");
    expect(redirectTarget(run("/fa/admin/users", seeker))).toBe("https://example.test/dashboard");
  });

  it("allows admin and owner roles into admin pages", () => {
    expect(run("/admin", { id: "a1", role: "ADMIN" })).toBe(true);
    expect(run("/admin", { id: "o1", role: "OWNER" })).toBe(true);
  });

  it("denies employer pages to job seekers and allows employers", () => {
    expect(redirectTarget(run("/employer/post-job", seeker))).toBe("https://example.test/dashboard");
    expect(run("/employer/post-job", { id: "e1", role: "EMPLOYER" })).toBe(true);
  });

  it("allows ordinary private pages for any signed-in user", () => {
    expect(run("/dashboard", seeker)).toBe(true);
    expect(run("/fa/saved-jobs", seeker)).toBe(true);
  });
});
