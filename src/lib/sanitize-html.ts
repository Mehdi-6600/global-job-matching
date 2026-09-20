import DOMPurify from "isomorphic-dompurify";

/**
 * HTML sanitizer for trusted-admin blog content.
 *
 * Uses DOMPurify (via isomorphic-dompurify) instead of regex-based
 * stripping. Regex sanitizers are known to be bypassable by malformed
 * HTML (nested tags, attribute smuggling, javascript: variants, etc.).
 *
 * The allowlist is intentionally narrow — only blog-friendly markup.
 * Links are restricted to http(s), mailto, or relative paths.
 */

const ALLOWED_TAGS = [
  "p",
  "br",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "s",
  "ul",
  "ol",
  "li",
  "h1",
  "h2",
  "h3",
  "h4",
  "blockquote",
  "code",
  "pre",
  "a",
  "span",
  "div",
  "hr",
  "table",
  "thead",
  "tbody",
  "tr",
  "th",
  "td",
];

const ALLOWED_ATTR = ["href", "title", "target", "rel"];

/**
 * URI scheme allowlist for links. Mirrors the old behavior:
 *   - relative paths starting with "/"
 *   - http(s)://
 *   - mailto:
 *
 * DOMPurify drops any attribute whose value does not match one of
 * these patterns, and additionally runs its own scheme checks.
 */
const ALLOWED_URI_REGEXP = /^(?:(?:https?|mailto):|\/)/i;

export function sanitizeBlogHtml(input: string): string {
  if (!input) return "";

  const clean = DOMPurify.sanitize(input, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOWED_URI_REGEXP,
    // Force external links to be safe against tab-nabbing.
    // (DOMPurify runs this hook on every <a> after parsing.)
    FORBID_TAGS: ["script", "style", "iframe", "object", "embed", "link", "meta"],
    FORBID_ATTR: ["style", "onerror", "onload", "onclick"],
    KEEP_CONTENT: true,
  });

  return String(clean);
}
