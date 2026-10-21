export type CredentialSignInErrorKey =
  | "rateLimited"
  | "invalidCredentials"
  | "generic";

/**
 * Auth.js wraps unexpected callback failures (including database outages) in
 * errors such as CallbackRouteError. Treat only explicit credential failures
 * as invalid credentials so service outages are not misreported as bad input.
 */
export function classifyCredentialSignInError(
  error: unknown,
): CredentialSignInErrorKey {
  const code = String(error ?? "").trim().toLowerCase();

  if (code.includes("rate_limited") || code.includes("ratelimit")) {
    return "rateLimited";
  }

  if (
    code.includes("credentialssignin") ||
    code === "invalid_credentials"
  ) {
    return "invalidCredentials";
  }

  return "generic";
}
