/**
 * Auth.js accepts the NEXTAUTH_* names for backwards compatibility, while the
 * current app configuration uses AUTH_* and NEXT_PUBLIC_APP_URL. Resolve those
 * aliases once so the auth route and edge middleware always use the same
 * secret and base URL.
 */
export type AuthEnvironmentSource = Readonly<
  Record<string, string | undefined>
>;

function firstNonEmpty(...values: Array<string | undefined>): string | undefined {
  for (const value of values) {
    const normalized = value?.trim();
    if (normalized) return normalized;
  }
  return undefined;
}

export function resolveAuthEnvironment(
  source: AuthEnvironmentSource = process.env,
) {
  const authUrl = firstNonEmpty(source.AUTH_URL, source.NEXTAUTH_URL);
  const vercelUrl = firstNonEmpty(source.VERCEL_URL);
  const deploymentUrl = vercelUrl
    ? /^https?:\/\//i.test(vercelUrl)
      ? vercelUrl
      : `https://${vercelUrl}`
    : undefined;

  const appUrl = firstNonEmpty(
    source.NEXT_PUBLIC_APP_URL,
    source.NEXT_PUBLIC_SITE_URL,
    authUrl,
    deploymentUrl,
  );

  return {
    authSecret: firstNonEmpty(source.AUTH_SECRET, source.NEXTAUTH_SECRET),
    authUrl,
    appUrl:
      appUrl ||
      (source.NODE_ENV === "production"
        ? "https://global-job-matching.vercel.app"
        : "http://localhost:3000"),
  };
}

/** Google OAuth is optional; expose the provider only when both credentials exist. */
export function hasGoogleAuthCredentials(
  source: AuthEnvironmentSource = process.env,
): boolean {
  return Boolean(
    firstNonEmpty(source.GOOGLE_CLIENT_ID) &&
      firstNonEmpty(source.GOOGLE_CLIENT_SECRET),
  );
}
