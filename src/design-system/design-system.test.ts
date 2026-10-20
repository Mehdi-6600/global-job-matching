import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Design-system regression tests.
 *
 * These are intentionally strict: they fail the build if the "Ink & Signal"
 * contract drifts. They read the source tree directly, so they catch problems
 * that a type-checker cannot see — dead CSS variables, reintroduced legacy
 * palette utilities, physical margin/padding direction utilities, duplicated
 * `<main>` landmarks, JSX class artifacts and missing i18n keys.
 *
 * No network, no database, no DOM: safe to run anywhere.
 */

const ROOT = process.cwd();
const SRC = join(ROOT, "src");

/** Files that are generated, dead, or intentionally exempt. */
const EXEMPT_FILES = new Set([
  // Dead duplicate of src/app/jobs/JobsClient.tsx — imported by nothing and
  // reported as a duplicate rather than deleted.
  "src/lib/jobs/JobsClient.tsx",
  // Open Graph images are rendered by next/og (Satori), not by the app shell.
  "src/app/opengraph-image.tsx",
  "src/app/twitter-image.tsx",
  "src/app/jobs/[id]/opengraph-image.tsx",
  "src/app/companies/[id]/opengraph-image.tsx",
  "src/app/blog/[slug]/opengraph-image.tsx",
]);

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const rel = relative(ROOT, full).split("\\").join("/");
    if (statSync(full).isDirectory()) {
      if (entry === "node_modules" || entry.startsWith(".")) continue;
      walk(full, out);
    } else if (/\.(tsx?|css)$/.test(entry) && !EXEMPT_FILES.has(rel)) {
      out.push(rel);
    }
  }
  return out;
}

const FILES = walk(SRC);
const TSX = FILES.filter((f) => f.endsWith(".tsx"));
const read = (f: string) => readFileSync(join(ROOT, f), "utf8");

/** Every `className="…"` / template literal body in a file. */
function classAttributes(source: string): string[] {
  const out: string[] = [];
  const re = /className=(?:"([^"]*)"|\{`([^`]*)`\})/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(source))) out.push(m[1] ?? m[2] ?? "");
  return out;
}

describe("design tokens", () => {
  const designSystem = read("src/app/design-system.css");
  const rootBlock = designSystem.slice(
    designSystem.indexOf(":root {"),
    designSystem.indexOf(".dark {"),
  );
  const darkBlock = designSystem.slice(designSystem.indexOf(".dark {"));
  const declared = (block: string) =>
    new Set(
      Array.from(block.matchAll(/(--[a-z0-9-]+)\s*:/g), (m) => m[1]),
    );

  const lightVars = declared(rootBlock);
  const darkVars = declared(darkBlock);

  /** Tokens that are deliberately theme-invariant (geometry, type, motion). */
  const THEME_INVARIANT =
    /^--(radius|font|ease|duration|container|gradient|shadow-light|shadow-dark)/;

  /** Provided by next/font, Radix or Tailwind at runtime. */
  const RUNTIME_PROVIDED =
    /^--(font-(geist|inter|vazirmatn|noto)|radix-|tw-)/;

  it("declares both :root and .dark blocks", () => {
    expect(designSystem).toContain(":root {");
    expect(designSystem).toContain(".dark {");
    expect(lightVars.size).toBeGreaterThan(40);
    expect(darkVars.size).toBeGreaterThan(30);
  });

  it("defines every token a component consumes", () => {
    const used = new Set<string>();
    for (const file of [...FILES]) {
      for (const m of read(file).matchAll(/var\((--[a-z0-9-]+)/g)) {
        used.add(m[1]);
      }
    }

    const undefinedTokens = [...used].filter(
      (token) =>
        !lightVars.has(token) &&
        !darkVars.has(token) &&
        !RUNTIME_PROVIDED.test(token),
    );

    expect(undefinedTokens).toEqual([]);
  });

  it("gives every colour token a dark-mode value", () => {
    const missing = [...lightVars].filter(
      (token) =>
        !darkVars.has(token) &&
        !THEME_INVARIANT.test(token) &&
        token !== "--card-accent",
    );

    expect(missing).toEqual([]);
  });
});

describe("WCAG AA contrast", () => {
  const designSystem = read("src/app/design-system.css");
  const slice = (start: string) => {
    const i = designSystem.indexOf(start);
    const j = designSystem.indexOf("\n}", i);
    return designSystem.slice(i, j);
  };
  const hexTokens = (text: string) =>
    Object.fromEntries(
      Array.from(text.matchAll(/(--[a-z0-9-]+):\s*(#[0-9a-fA-F]{6});/g), (m) => [
        m[1],
        m[2],
      ]),
    ) as Record<string, string>;

  const THEMES = {
    light: hexTokens(slice(":root {")),
    dark: hexTokens(slice(".dark {")),
  };

  function luminance(hex: string): number {
    const clean = hex.replace("#", "");
    const [r, g, b] = [0, 2, 4].map((i) => {
      const c = parseInt(clean.slice(i, i + 2), 16) / 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }

  function ratio(a: string, b: string): number {
    const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
    return (hi + 0.05) / (lo + 0.05);
  }

  /** Every text/background pairing the component layer actually produces. */
  const PAIRS: Array<[string, string]> = [
    ["--text-primary", "--bg-page"],
    ["--text-primary", "--surface"],
    ["--text-body", "--bg-page"],
    ["--text-body", "--surface"],
    ["--text-body", "--surface-2"],
    ["--text-muted", "--bg-page"],
    ["--text-muted", "--surface"],
    ["--text-muted", "--surface-2"],
    ["--text-subtle", "--bg-page"],
    ["--text-subtle", "--surface"],
    ["--text-on-brand", "--brand-primary"],
    ["--text-on-brand", "--warning"],
    ["--text-on-brand", "--error"],
    ["--text-on-brand", "--success"],
    ["--text-on-brand", "--info"],
    ["--text-on-brand", "--brand-accent"],
    ["--brand-primary", "--surface"],
    ["--brand-primary", "--brand-primary-soft"],
    ["--warning", "--surface"],
    ["--warning", "--warning-soft"],
    ["--error", "--surface"],
    ["--error", "--error-soft"],
    ["--success", "--surface"],
    ["--success", "--success-soft"],
    ["--info", "--surface"],
    ["--info", "--info-soft"],
    ["--brand-accent", "--surface"],
    ["--brand-accent", "--brand-accent-soft"],
  ];

  for (const theme of ["light", "dark"] as const) {
    it(`keeps text legible in ${theme} mode (>= 4.5:1)`, () => {
      const tokens = THEMES[theme];
      const failures: string[] = [];

      for (const [fg, bg] of PAIRS) {
        expect(tokens[fg], `${fg} missing in ${theme}`).toBeTruthy();
        expect(tokens[bg], `${bg} missing in ${theme}`).toBeTruthy();
        const value = ratio(tokens[fg], tokens[bg]);
        if (value < 4.5) {
          failures.push(
            `${theme}: ${fg} on ${bg} = ${value.toFixed(2)}:1`,
          );
        }
      }

      expect(failures).toEqual([]);
    });
  }
});

describe("class names", () => {
  it("contains no leftover legacy palette utilities", () => {
    // bg-slate-900/40, text-cyan-400, border-indigo-500/20, …
    const LEGACY =
      /(?<![\w-])(?:bg|text|border|from|to|via|ring|divide|placeholder)-(?:cyan|slate|indigo|emerald|red|amber|sky|blue|gray|zinc|purple|pink|fuchsia|teal|green|yellow|orange|violet|rose)-\d/;
    const offenders: string[] = [];

    for (const file of TSX) {
      const source = read(file);
      for (const cls of classAttributes(source)) {
        const hit = cls.match(LEGACY);
        if (hit) offenders.push(`${file}: ${hit[0]}`);
      }
    }

    expect(offenders).toEqual([]);
  });

  it("uses logical direction utilities, never physical ones", () => {
    const PHYSICAL = /(?<![\w-])(?:pl|pr|ml|mr|left|right)-\d/;
    const offenders: string[] = [];

    for (const file of TSX) {
      for (const cls of classAttributes(read(file))) {
        const hit = cls.match(PHYSICAL);
        if (hit) offenders.push(`${file}: ${hit[0]}`);
      }
    }

    expect(offenders).toEqual([]);
  });

  it("has no duplicated class tokens", () => {
    // Only real utilities are compared: template-literal expressions such as
    // `${statusColors[job.status]}` and interpolated fragments are skipped.
    const isUtility = (token: string) =>
      /^[a-z!-]/.test(token) &&
      token.includes("-") &&
      !/[$`{}"<>=;]/.test(token);

    const offenders: string[] = [];

    for (const file of TSX) {
      for (const cls of classAttributes(read(file))) {
        const tokens = cls.split(/\s+/).filter(isUtility);
        const dupes = tokens.filter((t, i) => tokens.indexOf(t) !== i);
        if (dupes.length) offenders.push(`${file}: ${dupes[0]}`);
      }
    }

    expect(offenders).toEqual([]);
  });

  it("has no broken JSX class artifacts", () => {
    // Patterns produced by bad search-and-replace: className="className=…
    const ARTIFACTS = [
      /className="className=/,
      /className=\{className=/,
      /`\{\s*$/m,
      /className="[^"]*"\s+className=/,
    ];
    const offenders = TSX.filter((file) =>
      ARTIFACTS.some((re) => re.test(read(file))),
    );

    expect(offenders).toEqual([]);
  });
});

describe("semantics", () => {
  it("keeps a single <main> landmark, owned by the layout", () => {
    const withMain = TSX.filter((file) => /<main\b/.test(read(file)));
    expect(withMain).toEqual(["src/app/layout.tsx"]);
  });

  it("gives every <main> an id that the skip link can target", () => {
    const layout = read("src/app/layout.tsx");
    expect(layout).toMatch(/<main[^>]+id="main-content"/);
    expect(read("src/components/navbar.tsx")).toContain('href="#main-content"');
  });

  it("labels every image", () => {
    const offenders: string[] = [];
    for (const file of TSX) {
      const source = read(file);
      for (const m of source.matchAll(/<(?:Image|img)\b[^>]*>/gs)) {
        if (!/\balt=/.test(m[0])) offenders.push(file);
      }
    }
    expect(offenders).toEqual([]);
  });
});

describe("accessible names", () => {
  /** Brand names, sample values and platform names are intentionally literal. */
  const ALLOWED_LITERALS = new Set([
    "Global Job Matching",
    "Twitter",
    "LinkedIn",
    "Facebook",
    "Alphabet",
    "you@example.com",
    "Acme Inc.",
    "https://example.com",
    "Search company or role...",
  ]);

  it("does not hardcode English in aria-label / title / alt / placeholder", () => {
    const ATTRIBUTE =
      /(?:aria-label|title|placeholder|alt)="([A-Za-z][^"]{2,})"/g;
    const offenders: string[] = [];

    for (const file of TSX) {
      for (const m of read(file).matchAll(ATTRIBUTE)) {
        const value = m[1].trim();
        if (ALLOWED_LITERALS.has(value)) continue;
        if (!/\s|[a-z]{3}/.test(value)) continue;
        offenders.push(`${file}: ${value}`);
      }
    }

    expect(offenders).toEqual([]);
  });

  it("does not hardcode screen-reader text", () => {
    const offenders: string[] = [];
    for (const file of TSX) {
      const source = read(file);
      for (const m of source.matchAll(
        /className="[^"]*\bsr-only\b[^"]*"[^>]*>([^<{]+)</g,
      )) {
        if (/[A-Za-z]{3}/.test(m[1])) offenders.push(`${file}: ${m[1].trim()}`);
      }
    }
    expect(offenders).toEqual([]);
  });
});

describe("i18n", () => {
  const messages = JSON.parse(read("messages/en.json")) as Record<
    string,
    unknown
  >;

  function hasKey(dotted: string): boolean {
    return dotted.split(".").reduce<unknown>((node, part) => {
      if (node && typeof node === "object" && part in node) {
        return (node as Record<string, unknown>)[part];
      }
      return undefined;
    }, messages) !== undefined;
  }

  it("resolves every t() key used in the app", () => {
    const missing = new Set<string>();
    for (const file of [...TSX, ...FILES.filter((f) => f.endsWith(".ts"))]) {
      for (const m of read(file).matchAll(
        /\bt\(\s*["']([A-Za-z0-9_]+\.[A-Za-z0-9_.]+)["']/g,
      )) {
        if (!hasKey(m[1])) missing.add(`${file}: ${m[1]}`);
      }
    }
    expect([...missing]).toEqual([]);
  });

  it("keeps all locales structurally identical", () => {
    const flatten = (obj: Record<string, unknown>, prefix = ""): string[] =>
      Object.entries(obj).flatMap(([key, value]) =>
        value && typeof value === "object"
          ? flatten(value as Record<string, unknown>, `${prefix}${key}.`)
          : [`${prefix}${key}`],
      );

    const reference = flatten(messages).sort();
    const locals = ["ar", "de", "es", "fa", "fr", "hi", "id", "ja", "pt", "tr", "zh"];

    for (const locale of locals) {
      const other = JSON.parse(
        read(`messages/${locale}.json`),
      ) as Record<string, unknown>;
      expect(flatten(other).sort(), `locale ${locale}`).toEqual(reference);
    }
  });
});

describe("runtime build artifacts", () => {
  it("ships the dark theme in the CSS layer", () => {
    expect(FILES).toContain("src/app/design-system.css");
    const designSystem = read("src/app/design-system.css");
    expect(designSystem).toMatch(/\.dark\s*\{[^}]*--bg-page/);
    expect(designSystem).toMatch(/\.dark\s*\{[^}]*--text-primary/);
  });

  it("never reintroduces next/font/google (build must stay offline)", () => {
    const offenders = TSX.filter((file) =>
      /next\/font\/google/.test(read(file)),
    );
    expect(offenders).toEqual([]);
  });

  it("ships the self-hosted font files", () => {
    const fonts = readdirSync(join(SRC, "fonts"));
    expect(fonts.filter((f) => f.endsWith(".woff2")).length).toBeGreaterThanOrEqual(4);
    expect(fonts.filter((f) => f.startsWith("LICENSE")).length).toBeGreaterThanOrEqual(4);
  });
});
