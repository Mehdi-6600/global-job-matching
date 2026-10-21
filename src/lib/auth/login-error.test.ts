import { describe, expect, it } from "vitest";
import { classifyCredentialSignInError } from "@/lib/auth/login-error";

describe("classifyCredentialSignInError", () => {
  it("recognizes rate-limit errors", () => {
    expect(classifyCredentialSignInError("rate_limited")).toBe("rateLimited");
    expect(classifyCredentialSignInError("RateLimitError")).toBe("rateLimited");
  });

  it("recognizes explicit invalid-credential errors", () => {
    expect(classifyCredentialSignInError("CredentialsSignin")).toBe(
      "invalidCredentials",
    );
    expect(classifyCredentialSignInError("invalid_credentials")).toBe(
      "invalidCredentials",
    );
  });

  it("does not misreport infrastructure failures as bad credentials", () => {
    expect(classifyCredentialSignInError("CallbackRouteError")).toBe("generic");
    expect(classifyCredentialSignInError(new Error("database unavailable"))).toBe(
      "generic",
    );
  });
});
