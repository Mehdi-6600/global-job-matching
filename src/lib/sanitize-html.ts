/**
 * Minimal HTML sanitizer for trusted-admin blog content.
 * Strips scripts, event handlers, javascript: URLs, and dangerous tags.
 * Not a full DOMPurify substitute — prefer plain text / markdown long-term.
 */

const ALLOWED_TAGS = new Set([
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
]);

const VOID_TAGS = new Set(["br", "hr"]);

function stripEventHandlers(attrs: string): string {
  return attrs
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/\s(href|src)\s*=\s*("\s*javascript:[^"]*"|'\s*javascript:[^']*'|javascript:[^\s>]*)/gi, "")
    .replace(/\sstyle\s*=\s*("[^"]*"|'[^']*')/gi, "");
}

function sanitizeOpenTag(tag: string, attrs: string): string {
  const name = tag.toLowerCase();
  if (!ALLOWED_TAGS.has(name)) return "";
  const cleanAttrs = stripEventHandlers(attrs);
  if (name === "a") {
    const hrefMatch = cleanAttrs.match(/\shref\s*=\s*("([^"]*)"|'([^']*)')/i);
    const href = hrefMatch ? hrefMatch[2] || hrefMatch[3] || "" : "";
    if (!href || !/^(https?:|mailto:|\/)/i.test(href)) {
      return `<${name}>`;
    }
    return `<a href="${href.replace(/"/g, "")}" rel="noopener noreferrer" target="_blank">`;
  }
  if (VOID_TAGS.has(name)) return `<${name}>`;
  return `<${name}${cleanAttrs}>`;
}

export function sanitizeBlogHtml(input: string): string {
  if (!input) return "";

  let html = input
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, "")
    .replace(/<iframe[\s\S]*?>[\s\S]*?<\/iframe>/gi, "")
    .replace(/<object[\s\S]*?>[\s\S]*?<\/object>/gi, "")
    .replace(/<embed[\s\S]*?>/gi, "")
    .replace(/<link[\s\S]*?>/gi, "")
    .replace(/<meta[\s\S]*?>/gi, "");

  html = html.replace(
    /<\/?([a-zA-Z0-9]+)(\s[^>]*)?>/g,
    (full, tag: string, attrs: string = "") => {
      if (full.startsWith("</")) {
        const name = tag.toLowerCase();
        return ALLOWED_TAGS.has(name) && !VOID_TAGS.has(name)
          ? `</${name}>`
          : "";
      }
      return sanitizeOpenTag(tag, attrs || "");
    }
  );

  return html;
}
