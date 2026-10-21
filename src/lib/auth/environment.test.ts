import { afterEach, describe, expect, it, vi } from "vitest";
import {
  hasGoogleAuthCredentials,
  resolveAuthEnvironment,
} from "@/lib/auth/environment";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("resolveAuthEnvironment", () => {
  it("prefers the current Auth.js names over legacy names", () => {
    const result = resolveAuthEnvironment({
      AUTH_SECRET: " current-secret ",
      NEXTAUTH_SECRET: "legacy-secret",
      AUTH_URL: "https://auth.example.test/",
      NEXTAUTH_URL: "https://legacy.example.test/",
      NEXT_PUBLIC_APP_URL: "https://app.example.test/",
      NEXT_PUBLIC_SITE_URL: "https://site.example.test/",
      NODE_ENV: "production",
    });

    expect(result.authSecret).toBe("current-secret");
    expect(result.authUrl).toBe("https://auth.example.test/");
    expect(result.appUrl).toBe("https://app.example.test/");
  });

  it("accepts the documented NEXTAUTH_* aliases", () => {
    const result = resolveAuthEnvironment({
      NEXTAUTH_SECRET: "legacy-secret",
      NEXTAUTH_URL: "https://legacy.example.test/",
      NODE_ENV: "production",
    });

    expect(result.authSecret).toBe("legacy-secret");
    expect(result.authUrl).toBe("https://legacy.example.test/");
    expect(result.appUrl).toBe("https://legacy.example.test/");
  });

  it("enables Google only when both credentials are present", () => {
    expect(
      hasGoogleAuthCredentials({
        GOOGLE_CLIENT_ID: "client-id",
        GOOGLE_CLIENT_SECRET: " client-secret ",
      }),
    ).toBe(true);
    expect(
      hasGoogleAuthCredentials({
        GOOGLE_CLIENT_ID: "client-id",
        GOOGLE_CLIENT_SECRET: " ",
      }),
    ).toBe(false);
    expect(hasGoogleAuthCredentials({ GOOGLE_CLIENT_SECRET: "secret" })).toBe(
      false,
    );
  });

  it("builds the app URL from Vercel's deployment hostname", () => {
    const result = resolveAuthEnvironment({
      VERCEL_URL: "preview-branch.vercel.app",
      NODE_ENV: "production",
    });

    expect(result.appUrl).toBe("https://preview-branch.vercel.app");
  });

  it("uses safe local and production URL defaults", () => {
    expect(resolveAuthEnvironment({ NODE_ENV: "development" }).appUrl).toBe(
      "http://localhost:3000",
    );
    expect(resolveAuthEnvironment({ NODE_ENV: "production" }).appUrl).toBe(
      "https://global-job-matching.vercel.app",
    );
  });

  it("loads shared config without an unrelated sync secret", async () => {
    vi.stubEnv("DATABASE_URL", "postgresql://test:test@localhost:5432/test");
    vi.stubEnv("AUTH_SECRET", "");
    vi.stubEnv(
      "NEXTAUTH_SECRET",
      "legacy-auth-secret-that-is-at-least-32-characters",
    );
    vi.stubEnv("AUTH_URL", "");
    vi.stubEnv("NEXTAUTH_URL", "https://legacy.example.test");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "");
    vi.stubEnv("SYNC_SECRET", "");
    vi.stubEnv("GOOGLE_CLIENT_ID", "partial-client-id");
    vi.stubEnv("GOOGLE_CLIENT_SECRET", "");
    vi.stubEnv("SKIP_ENV_VALIDATION", "");
    vi.stubEnv("NODE_ENV", "test");
    vi.resetModules();

    const { env } = await import("@/lib/env");

    expect(env.AUTH_SECRET).toBe(
      "legacy-auth-secret-that-is-at-least-32-characters",
    );
    expect(env.AUTH_URL).toBe("https://legacy.example.test");
    expect(env.NEXT_PUBLIC_APP_URL).toBe("https://legacy.example.test");
    expect(env.SYNC_SECRET).toBeUndefined();
    expect(env.GOOGLE_CLIENT_ID).toBe("partial-client-id");
    expect(env.GOOGLE_CLIENT_SECRET).toBeUndefined();
  });
});
