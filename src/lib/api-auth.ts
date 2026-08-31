import { timingSafeEqual } from "node:crypto";

/**
 * Validate a bearer secret using constant-time comparison.
 *
 * Secrets must never be sent in query strings because URLs can be
 * stored in browser history, proxy logs, analytics systems, and
 * server access logs.
 */
export function isAuthorizedBearerSecret(
  request: Request,
  expectedSecret: string
): boolean {
  const authorization = request.headers.get("authorization");

  if (!authorization) {
    return false;
  }

  const prefix = "Bearer ";

  if (!authorization.startsWith(prefix)) {
    return false;
  }

  const providedSecret = authorization.slice(prefix.length).trim();

  if (!providedSecret || !expectedSecret) {
    return false;
  }

  const provided = Buffer.from(providedSecret, "utf8");
  const expected = Buffer.from(expectedSecret, "utf8");

  if (provided.length !== expected.length) {
    return false;
  }

  return timingSafeEqual(provided, expected);
}
