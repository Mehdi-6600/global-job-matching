#!/usr/bin/env python3
"""Black-box probe for a deployed instance.

No browser, no JS execution: this verifies HTTP status, redirects, HTML
structure, CSS payloads, locale directionality, API responses, security
headers and accidental secret exposure. It intentionally prints evidence
(status codes and body snippets) rather than only PASS/FAIL.
"""
import re
import sys
import urllib.error
import urllib.request

BASE = (sys.argv[1] if len(sys.argv) > 1 else "https://global-job-matching.vercel.app").rstrip("/")
UA = "Mozilla/5.0 (compatible; gjm-live-probe/1.0)"

results = []  # (kind, message)
failures = []


def record(kind, msg):
    results.append((kind, msg))
    if kind == "--":
        print()
        print(msg)
        return
    print(f"{kind:<4} {msg}")
    if kind == "FAIL":
        failures.append(msg)


def fetch(path, method="GET", timeout=45):
    req = urllib.request.Request(BASE + path, method=method, headers={"User-Agent": UA})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return r.status, dict(r.headers), r.read().decode("utf-8", "replace")
    except urllib.error.HTTPError as e:
        return e.code, dict(e.headers), e.read().decode("utf-8", "replace")
    except Exception as e:  # network/timeout
        return 0, {}, f"<error: {e}>"


def check_status(label, path, want):
    code, _, body = fetch(path)
    if code == want:
        record("PASS", f"{label} → {code}")
    else:
        snippet = re.sub(r"\s+", " ", body[:220])
        record("FAIL", f"{label} → got {code}, want {want} | {snippet}")


def check_redirect(label, path):
    code, headers, body = fetch(path)
    loc = headers.get("Location", "")
    if code in (301, 302, 303, 307, 308) and re.search(r"/login|/signin|/auth", loc):
        record("PASS", f"{label} → {code} → {loc}")
    elif code == 200:
        record("FAIL", f"{label} returned 200 without a session")
    else:
        snippet = re.sub(r"\s+", " ", body[:160])
        record("WARN", f"{label} → {code} loc={loc} | {snippet}")


def check_pattern(label, path, pattern, flags=re.I):
    code, _, body = fetch(path)
    if re.search(pattern, body, flags):
        record("PASS", label)
    else:
        record("FAIL", f"{label} (pattern /{pattern}/ not in {path}, status {code})")


def section(title):
    record("--", title)


# ---------------------------------------------------------------- pages
section("pages (public)")
for p in [
    "/", "/jobs", "/pricing", "/login", "/register", "/forgot-password",
    "/reset-password", "/verify-email", "/companies", "/locations",
    "/categories", "/crypto-jobs", "/blog", "/terms", "/privacy", "/about",
    "/contact", "/employers", "/bootstrap-owner",
]:
    check_status(f"GET {p}", p, 200)

section("auth-required routes redirect to login")
for p in [
    "/dashboard", "/settings", "/saved-jobs", "/admin", "/profile",
    "/notifications", "/my-applications", "/my-interviews", "/job-alerts",
    "/career-risk", "/resume-builder", "/employer/dashboard", "/payment",
]:
    check_redirect(f"GET {p}", p)

section("unsupported locale behaves sanely")
code, _, _ = fetch("/he")
record("PASS" if code in (404, 302, 307) else "WARN", f"GET /he (not a supported locale) → {code}")

# ---------------------------------------------------------------- locales
section("locale directionality (12 configured locales)")
for loc in ["ar", "fa"]:
    check_pattern(f"/{loc} has dir=rtl", f"/{loc}", r'<html[^>]+dir="rtl"')
for loc in ["en", "de", "es", "fr", "hi", "id", "ja", "pt", "tr", "zh"]:
    check_pattern(f"/{loc} has dir=ltr", f"/{loc}", r'<html[^>]+dir="ltr"')
check_pattern("/fa renders Persian characters", "/fa", r"[\u0600-\u06ff]")
check_pattern("/ar renders Arabic characters", "/ar", r"[\u0600-\u06ff]")
check_pattern("/ja renders Japanese characters", "/ja", r"[\u3040-\u30ff]")
check_pattern("/zh renders Han characters", "/zh", r"[\u4e00-\u9fff]")
check_pattern("/hi renders Devanagari characters", "/hi", r"[\u0900-\u097f]")

# ---------------------------------------------------------------- design
section("design system payload")
code, _, html = fetch("/")
css_urls = re.findall(r'/_next/static/css/[A-Za-z0-9._-]+\.css', html)
css_urls = list(dict.fromkeys(css_urls))
if not css_urls:
    record("FAIL", "no stylesheet links found in /")
css = ""
for url in css_urls:
    c, _, body = fetch(url)
    record("PASS" if c == 200 else "FAIL", f"stylesheet {url} → {c} ({len(body)} bytes)")
    css += body

for token in ["--card-accent", "--text-on-brand", "--radius"]:
    record("PASS" if token in css else "FAIL", f"design token {token} {'present' if token in css else 'MISSING'} in CSS")
record("PASS" if ".dark" in css else "FAIL", "dark-theme (.dark) rules in CSS")
record("PASS" if "prefers-reduced-motion" in css else "WARN", "prefers-reduced-motion rules in CSS")
record("PASS" if "@font-face" in css else "WARN", "@font-face declarations in CSS")
record("PASS" if "focus-visible" in css else "WARN", ":focus-visible styles in CSS")
record("PASS" if "inset-inline" in css or "margin-inline" in css or "padding-inline" in css else "WARN",
       "logical (RTL-safe) properties in CSS")

fonts = re.findall(r'/_next/static/media/[A-Za-z0-9._-]+\.woff2', html)
if fonts:
    c, h, _ = fetch(fonts[0])
    record("PASS" if c == 200 else "FAIL", f"font {fonts[0]} → {c} ({h.get('Content-Type', '?')})")
else:
    record("WARN", "no woff2 referenced in initial HTML")

record("PASS" if 'id="main-content"' in html else "FAIL", "<main id=main-content> landmark")
record("PASS" if 'lang="en"' in html else "WARN", 'lang attribute on <html>')
icons = len(re.findall(r"<svg", html))
record("PASS" if icons > 0 else "WARN", f"{icons} inline <svg> icons in homepage markup")

# ---------------------------------------------------------------- API
section("API surface (evidence: status + body head)")
def one_line(text, limit):
    return re.sub(r"\s+", " ", text)[:limit]

code, _, body = fetch("/api/jobs")
record("PASS" if code == 200 else "FAIL", "GET /api/jobs → %s | %s" % (code, one_line(body, 300)))
for q in ["?limit=1", "?page=1&limit=12", "?search=engineer", "?remote=true&limit=3"]:
    code, _, body = fetch("/api/jobs" + q)
    record("PASS" if code == 200 else "FAIL", "GET /api/jobs%s → %s | %s" % (q, code, one_line(body, 200)))

for path, want in [
    ("/api/cron/verify-payments", (401, 503)),
    ("/api/admin/stats", (401, 403)),
    ("/api/admin/users", (401, 403)),
    ("/api/jobs/create", (401, 403, 405)),
]:
    code, _, body = fetch(path)
    mark = "PASS" if code in want else "FAIL"
    record(mark, "GET %s unauth → %s (want %s) | %s" % (path, code, want, one_line(body, 120)))

for path in ["/api/analytics", "/admin/newsletter"]:
    code, _, body = fetch(path)
    record("WARN", "%s → %s | %s" % (path, code, one_line(body, 160)))

section("SEO routes")
for path in ["/robots.txt", "/sitemaps.xml", "/sitemap/0.xml"]:
    check_status(f"GET {path}", path, 200)
code, _, robots = fetch("/robots.txt")
record("PASS" if "Sitemap:" in robots or "sitemap:" in robots else "FAIL",
       "robots.txt declares a sitemap: " + next((l for l in robots.splitlines() if "itemap" in l), "none"))

# ---------------------------------------------------------------- headers
section("security headers on /")
code, headers, _ = fetch("/")
lower = {k.lower(): v for k, v in headers.items()}
csp = lower.get("content-security-policy", "")
record("PASS" if csp else "FAIL", f"CSP present ({len(csp)} chars)")
for directive in ["default-src", "script-src", "img-src", "frame-ancestors", "object-src", "base-uri"]:
    record("PASS" if directive in csp else "WARN", f"CSP directive {directive} {'present' if directive in csp else 'MISSING'}")
record("PASS" if "api.qrserver.com" in csp else "WARN", "CSP img-src allows the QR provider")
for h in ["x-content-type-options", "referrer-policy", "x-frame-options", "strict-transport-security", "permissions-policy"]:
    record("PASS" if lower.get(h) else "WARN", f"header {h}: {lower.get(h, 'MISSING')}")
record("PASS" if "x-powered-by" not in lower else "WARN", "x-powered-by not exposed")

# ---------------------------------------------------------------- leakage
section("secret exposure")
combined = fetch("/")[2] + fetch("/pricing")[2] + fetch("/api/jobs")[2]
for pat in ["postgres://", "postgresql://", "AUTH_SECRET", "DATABASE_URL", "sk_live", "sk-proj",
            "BEGIN PRIVATE KEY", "NEXTAUTH_SECRET", "CRON_SECRET", "BLOB_READ_WRITE_TOKEN"]:
    record("FAIL" if pat in combined else "PASS", f"no {pat!r} in public HTML/JSON")

# ---------------------------------------------------------------- summary
print()
print("==================== SUMMARY ====================")
counts = {}
for kind, _ in results:
    counts[kind] = counts.get(kind, 0) + 1
print(" ".join(f"{k.lower()}={v}" for k, v in sorted(counts.items())))
if failures:
    print("failures:")
    for f in failures:
        print(" - " + f)
    sys.exit(1)
