# Self-hosted fonts

These files are loaded through `next/font/local` in `src/app/layout.tsx`.
Self-hosting keeps `next build` deterministic (no Google Fonts fetch) and
matches the production CSP rule `font-src 'self' data:`.

| File | Family | Script | Source |
| --- | --- | --- | --- |
| `Inter-Variable-latin.woff2` | Inter | Latin | `@fontsource-variable/inter` 5.x |
| `Vazirmatn-Variable-arabic.woff2` | Vazirmatn | Arabic (Persian) | `@fontsource-variable/vazirmatn` 5.x |
| `NotoKufiArabic-Variable-arabic.woff2` | Noto Kufi Arabic | Arabic | `@fontsource-variable/noto-kufi-arabic` 5.x |
| `NotoSansDevanagari-Variable-devanagari.woff2` | Noto Sans Devanagari | Devanagari (Hindi) | `@fontsource-variable/noto-sans-devanagari` 5.x |

All four families are licensed under the SIL Open Font License 1.1; the
licence text is included next to each file (`LICENSE-*.txt`). The `.woff2`
files are the variable-weight (`wght`, 100–900) subsets published by
Fontsource. To update a font, download the newer variable subset from the
corresponding Fontsource package and keep the same filename.
