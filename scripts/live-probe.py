#!/usr/bin/env python3
"""Black-box probe for a deployed instance.

No browser and no JS execution: this verifies HTTP status, redirects, HTML
structure, CSS payloads, locale directionality, API responses, security headers
and accidental secret exposure. It prints evidence (status codes, body heads)
next to every verdict.

Usage: python3 scripts/live-probe.py [base-url]
Exit code 0 = every assertion passed, 1 = at least one FAIL.
"""
import re
import sys
import urllib.error
import urllib.request

BASE = (sys.argv[1] if len(sys.argv) > 1 else "https://global-job-matching.vercel.app").rstrip("/")
UA = "Mozilla/5.0 (compatible; gjm-live-probe/1.0)"

results = []
failures = []


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


OPENER = urllib.request.build_opener(NoRedirect)


def say(msg=""):
    print(msg, flush=True)


def record(kind, msg):
    results.append((kind, msg))
    if kind == "--":
        say("")
        say(msg)
        return
    say(f"{kind:<4} {msg}")
    if kind == "FAIL":
        failures.append(msg)


def one_line(text, limit=200):
    return re.sub(r"\s+", " ", text)[:limit]


def visible_text(html: str) -> str:
    """Strip scripts, styles and comments.

    Client bundles ship translated strings (e.g. the error boundary's
    "Something went wrong"), so a raw substring match produces false positives.
    Only text that survives this filter is rendered to the visitor.
    """
    html = re.sub(r"(?is)<script\b.*?</script>", " ", html)
    html = re.sub(r"(?is)<style\b.*?</style>", " ", html)
    html = re.sub(r"(?s)<!--.*?-->", " ", html)
    return html


def fetch(path, timeout=45):
    req = urllib.request.Request(BASE + path, headers={"User-Agent": UA})
    try:
        with OPENER.open(req, timeout=timeout) as r:
            return r.status, dict(r.headers), r.read().decode("utf-8", "replace")
    except urllib.error.HTTPError as e:
        return e.code, dict(e.headers), e.read().decode("utf-8", "replace")
    except Exception as e:  # network error / timeout
        return 0, {}, f"<error: {e}>"


def check_status(label, path, want):
    code, _, body = fetch(path)
    if code == want:
        record("PASS", f"{label} → {code}")
    else:
        record("FAIL", f"{label} → got {code}, want {want} | {one_line(body, 160)}")


def check_redirect(label, path):
    code, headers, body = fetch(path)
    loc = headers.get("Location", "")
    if code in (301, 302, 303, 307, 308) and re.search(r"/login|/signin|/auth", loc):
        record("PASS", f"{label} → {code} → {loc}")
    elif code == 200:
        record("FAIL", f"{label} returned 200 without a session")
    else:
        record("WARN", f"{label} → {code} loc={loc} | {one_line(body, 120)}")


def check_pattern(label, path, pattern, flags=re.I):
    code, _, body = fetch(path)
    if re.search(pattern, body, flags):
        record("PASS", label)
    else:
        record("FAIL", f"{label} (/{pattern}/ not found in {path}, status {code})")


say(f"== base: {BASE} ==")

record("--", "public pages")
for p in ["/", "/jobs", "/pricing", "/login", "/register", "/forgot-password",
          "/reset-password", "/verify-email", "/companies", "/locations",
          "/categories", "/crypto-jobs", "/blog", "/terms", "/privacy", "/about",
          "/contact", "/jobs?page=2"]:
    check_status(f"GET {p}", p, 200)

record("--", "auth-required routes redirect to /login")
for p in ["/dashboard", "/settings", "/saved-jobs", "/admin", "/profile",
          "/notifications", "/my-applications", "/my-interviews", "/job-alerts",
          "/career-risk", "/resume-builder", "/employer/dashboard", "/payment"]:
    check_redirect(f"GET {p}", p)

record("--", "locale directionality (12 locales)")
for loc in ["ar", "fa"]:
    check_pattern(f"/{loc} dir=rtl", f"/{loc}", r'<html[^>]+dir="rtl"')
for loc in ["en", "de", "es", "fr", "hi", "id", "ja", "pt", "tr", "zh"]:
    check_pattern(f"/{loc} dir=ltr", f"/{loc}", r'<html[^>]+dir="ltr"')
check_pattern("/fa renders Persian", "/fa", r"[\u0600-\u06ff]")
check_pattern("/ar renders Arabic", "/ar", r"[\u0600-\u06ff]")
check_pattern("/ja renders Japanese", "/ja", r"[\u3040-\u30ff]")
check_pattern("/zh renders Han", "/zh", r"[\u4e00-\u9fff]")
check_pattern("/hi renders Devanagari", "/hi", r"[\u0900-\u097f]")
code, _, _ = fetch("/he")
record("PASS" if code in (302, 307, 404) else "WARN", f"/he (unsupported locale) → {code}")

record("--", "design system payload")
code, _, html = fetch("/")
css_urls = list(dict.fromkeys(re.findall(r'/_next/static/css/[A-Za-z0-9._-]+\.css', html)))
if not css_urls:
    record("FAIL", "no stylesheet links found in /")
css = ""
for url in css_urls:
    c, _, body = fetch(url)
    record("PASS" if c == 200 else "FAIL", f"stylesheet {url} → {c} ({len(body)} bytes)")
    css += body
for token in ["--card-accent", "--text-on-brand", "--radius"]:
    record("PASS" if token in css else "FAIL", f"design token {token} {'present' if token in css else 'MISSING'}")
for needle, label in [(".dark", "dark-theme rules"), ("prefers-reduced-motion", "reduced-motion rules"),
                      ("@font-face", "@font-face"), ("focus-visible", ":focus-visible")]:
    record("PASS" if needle in css else "WARN", f"{label} in CSS")
record("PASS" if ("margin-inline" in css or "padding-inline" in css or "inset-inline" in css) else "WARN",
       "logical (RTL-safe) properties in CSS")
fonts = re.findall(r'/_next/static/media/[A-Za-z0-9._-]+\.woff2', html)
if fonts:
    c, h, _ = fetch(fonts[0])
    record("PASS" if c == 200 else "FAIL", f"font {fonts[0]} → {c} ({h.get('Content-Type', '?')})")
else:
    record("WARN", "no woff2 referenced in initial HTML")
record("PASS" if 'id="main-content"' in html else "FAIL", "<main id=main-content> landmark")
record("PASS" if 'lang="en"' in html else "WARN", "lang attribute on <html>")
record("PASS" if len(re.findall(r"<svg", html)) > 0 else "WARN",
       f"{len(re.findall(r'<svg', html))} inline svg icons on /")

record("--", "job content renders")
code, _, jobs_html = fetch("/jobs")
cards = re.findall(r'href="[^"]*/jobs/([a-z0-9]{20,})"', jobs_html)
record("PASS" if len(cards) >= 5 else "FAIL",
       f"/jobs lists {len(cards)} job links")
record("PASS" if "Could not load jobs" not in visible_text(jobs_html) else "FAIL",
       "/jobs has no 'Could not load jobs' error")
if cards:
    detail = f"/jobs/{cards[0]}"
    code, _, detail_html = fetch(detail)
    record("PASS" if code == 200 else "FAIL", f"GET {detail} → {code}")
    visible_detail = visible_text(detail_html)
    if "Something went wrong" in visible_detail:
        at = visible_detail.find("Something went wrong")
        record("FAIL", "job detail has no error boundary"
               f" | context: {one_line(visible_detail[max(0, at - 300):at + 80], 380)}")
    else:
        record("PASS", "job detail has no error boundary")
    record("PASS" if len(detail_html) > 4000 else "WARN",
           f"job detail payload {len(detail_html)} bytes")
    record("PASS" if "<h1" in detail_html else "FAIL", "job detail has an <h1> title")
    visible = visible_text(detail_html)
    record("PASS" if "Apply" in visible or "Sign In" in visible else "FAIL",
           "job detail shows an apply / sign-in call to action")
    # The match-score card used to fall through to the error paragraph before
    # hydration, so a logged-out visitor saw "Something went wrong" on every
    # job page. It must show a loading/muted state instead.
    record("PASS" if "Your match score" in visible else "WARN",
           "job detail renders the match-score card")
record("PASS" if "Could not load jobs" not in visible_text(html) else "FAIL",
       "homepage has no 'Could not load jobs' error")
code, _, companies = fetch("/companies")
record("PASS" if code == 200 and re.search(r"/jobs\?company=", companies) else "FAIL",
       f"/companies → {code} with employer links")
for loc in ["fa", "ar", "de"]:
    code, _, body_ = fetch(f"/{loc}/jobs")
    record("PASS" if code == 200 else "WARN", f"/{loc}/jobs → {code}")

record("--", "API surface")
code, _, body = fetch("/api/jobs")
record("PASS" if code == 200 else "FAIL", f"GET /api/jobs → {code} | {one_line(body, 240)}")
for field in ['"featured"', '"featuredUntil"', '"pagination"']:
    record("PASS" if field in body else "FAIL", f"/api/jobs payload has {field}")
for q in ["?limit=1", "?page=1&limit=12", "?search=engineer", "?remote=true&limit=3"]:
    code, _, body = fetch("/api/jobs" + q)
    record("PASS" if code == 200 else "FAIL", f"GET /api/jobs{q} → {code} | {one_line(body, 160)}")
code, _, body = fetch("/api/jobs/cmvgbfdfo00hjl707gfqxuc9m")
record("PASS" if code == 200 else "FAIL", f"GET /api/jobs/<known id> → {code} | {one_line(body, 160)}")
for path, want in [("/api/cron/verify-payments", (401, 503)),
                   ("/api/admin/stats", (401, 403)),
                   ("/api/admin/users", (401, 403))]:
    code, _, body = fetch(path)
    record("PASS" if code in want else "FAIL",
           f"GET {path} unauth → {code} (want {want}) | {one_line(body, 100)}")
for path in ["/api/analytics", "/admin/newsletter"]:
    code, _, body = fetch(path)
    record("WARN", f"{path} → {code} | {one_line(body, 110)}")

record("--", "SEO routes")
for path in ["/robots.txt", "/sitemaps.xml", "/sitemap/0.xml"]:
    check_status(f"GET {path}", path, 200)
code, _, robots = fetch("/robots.txt")
record("PASS" if "Sitemap:" in robots else "FAIL",
       "robots.txt sitemap: " + next((l for l in robots.splitlines() if "itemap" in l), "none"))

record("--", "security headers on /")
code, headers, _ = fetch("/")
lower = {k.lower(): v for k, v in headers.items()}
csp = lower.get("content-security-policy", "")
record("PASS" if csp else "FAIL", f"CSP present ({len(csp)} chars)")
for directive in ["default-src", "script-src", "img-src", "frame-ancestors", "object-src", "base-uri"]:
    record("PASS" if directive in csp else "WARN", f"CSP directive {directive}")
for h in ["x-content-type-options", "referrer-policy", "x-frame-options",
          "strict-transport-security", "permissions-policy"]:
    record("PASS" if lower.get(h) else "WARN", f"header {h}: {lower.get(h, 'MISSING')}")
record("PASS" if "x-powered-by" not in lower else "WARN", "x-powered-by not exposed")

record("--", "secret exposure")
combined = fetch("/")[2] + fetch("/pricing")[2] + fetch("/api/jobs")[2]
for pat in ["postgres://", "postgresql://", "AUTH_SECRET", "DATABASE_URL", "sk_live",
            "sk-proj", "BEGIN PRIVATE KEY", "NEXTAUTH_SECRET", "CRON_SECRET",
            "BLOB_READ_WRITE_TOKEN"]:
    record("FAIL" if pat in combined else "PASS", f"no {pat!r} in public HTML/JSON")

say("")
say("==================== SUMMARY ====================")
counts = {}
for kind, _ in results:
    counts[kind] = counts.get(kind, 0) + 1
say(" ".join(f"{k.lower()}={v}" for k, v in sorted(counts.items())))
if failures:
    say("failures:")
    for f in failures:
        say(" - " + f)
    sys.exit(1)
