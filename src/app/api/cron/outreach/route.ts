import { NextRequest, NextResponse } from "next/server";
import { isAuthorizedBearerSecret } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { securityLog } from "@/lib/security-log";

import { normalizeCompanyKey, getCooldownCutoff } from "@/lib/outreach";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || "https://global-job-matching.vercel.app";

function buildPitchHtml(opts: { companyName: string; slotsLeft: number; pricingUrl: string; postJobUrl: string; stats: string }) {
  return `
<!DOCTYPE html>
<html><body style="font-family:Inter,Arial,sans-serif;line-height:1.6;color:#111;max-width:640px;margin:0 auto;padding:24px">
  <p>Hi ${opts.companyName} team,</p>
  <p>We featured your roles on <strong>Global Job Matching</strong> (${opts.stats}). Recruiters using our crypto-native board get verified global applicants in &lt;48h.</p>
  <div style="margin:20px 0;padding:16px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px">
    <p style="margin:0 0 8px;font-weight:700">⚡ Only ${opts.slotsLeft} featured spots left today — pin your job to homepage + newsletter</p>
    <p style="margin:0">From <strong>$19 / 7 days</strong> — paid in crypto, auto-verified.</p>
  </div>
  <p>
    <a href="${opts.pricingUrl}" style="display:inline-block;background:#16a34a;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:700;margin-right:8px">View Pricing & Pay →</a>
    <a href="${opts.postJobUrl}" style="display:inline-block;background:#111;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:700">Post a Job →</a>
  </p>
  <p style="color:#666;font-size:13px">No reply needed — 1-click checkout on site. Questions? Reply to this email.<br/>— Global Job Matching · <a href="${APP_URL}">${APP_URL}</a></p>
  <p style="color:#999;font-size:11px">You receive this because your public job listing was syndicated via approved sources with attribution. Unsubscribe: reply UNSUBSCRIBE.</p>
</body></html>`;
}

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || cronSecret.length < 16) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 503 });
  }
  if (!isAuthorizedBearerSecret(req, cronSecret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const dryRun = url.searchParams.get("dryRun") === "1" || url.searchParams.get("dryRun") === "true";

  try {
    const featuredCount = await db.job.count({
      where: { featured: true, featuredUntil: { gte: new Date() }, status: "active" },
    }).catch(() => 0);
    const slotsLeft = Math.max(0, 5 - featuredCount);
    const totalJobs = await db.job.count({ where: { status: "active" } }).catch(() => 0);

    const recentJobs = await db.job.findMany({
      where: { status: "active" },
      orderBy: { createdAt: "desc" },
      take: 30,
      select: {
        id: true,
        title: true,
        company: { select: { id: true, name: true, website: true, email: true } },
      },
    });

    const seen = new Set<string>();
    const targets: { companyId: string | null; companyName: string; website: string | null; email: string | null; companyKey: string }[] = [];
    for (const j of recentJobs) {
      if (!j.company) continue;
      const key = normalizeCompanyKey(j.company.name, j.company.website);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      targets.push({
        companyId: j.company.id,
        companyName: j.company.name,
        website: j.company.website,
        email: j.company.email,
        companyKey: key,
      });
      if (targets.length >= 10) break;
    }

    if (targets.length === 0) {
      return NextResponse.json({ success: true, dryRun, sent: 0, message: "No targets this run", stats: { totalJobs, featuredCount, slotsLeft } });
    }

    const pricingUrl = `${APP_URL.replace(/\/$/, "")}/pricing`;
    const postJobUrl = `${APP_URL.replace(/\/$/, "")}/employer/post-job`;
    const stats = `${totalJobs.toLocaleString()} active global jobs`;
    const cooldownCutoff = getCooldownCutoff();

    let sent = 0;
    let skippedNoEmail = 0;
    let skippedCooldown = 0;
    const errors: string[] = [];
    const details: Array<{ companyKey: string; companyName: string; decision: string; reason: string }> = [];

    for (const t of targets) {
      const recent = await db.outreachAttempt.findFirst({
        where: {
          companyKey: t.companyKey,
          createdAt: { gt: cooldownCutoff },
        },
      }).catch(() => null);
      if (recent) {
        skippedCooldown++;
        details.push({ companyKey: t.companyKey, companyName: t.companyName, decision: "skip", reason: `cooldown active (last ${recent.status} at ${recent.createdAt.toISOString()} within 7d)` });
        continue;
      }

      if (!t.email) {
        skippedNoEmail++;
        details.push({ companyKey: t.companyKey, companyName: t.companyName, decision: "skip", reason: "no stored email — enrichment required (safe, no guessing)" });
        continue;
      }

      if (dryRun) {
        details.push({
          companyKey: t.companyKey,
          companyName: t.companyName,
          decision: "would_send",
          reason: `dryRun: would send to ${t.email} (slotsLeft=${slotsLeft})`,
        });
        continue;
      }

      let attemptId: string | null = null;
      try {
        const created = await db.$transaction(async (tx) => {
          // Advisory lock per companyKey to serialize concurrent outreach for same company
          await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${t.companyKey}))`;
          const recentTx = await tx.outreachAttempt.findFirst({
            where: {
              companyKey: t.companyKey,
              createdAt: { gt: getCooldownCutoff() },
            },
          });
          if (recentTx) throw Object.assign(new Error("COOLDOWN"), { code: "COOLDOWN" });
          return tx.outreachAttempt.create({
            data: {
              companyId: t.companyId,
              companyKey: t.companyKey,
              companyName: t.companyName,
              email: t.email,
              status: "pending",
              windowKey: `${t.companyKey}:${Date.now()}`,
            },
          });
        });
        attemptId = created.id;
      } catch (e: unknown) {
        const err = e as { code?: string; message?: string };
        if (err?.code === "COOLDOWN" || err?.message === "COOLDOWN") {
          skippedCooldown++;
          details.push({ companyKey: t.companyKey, companyName: t.companyName, decision: "skip", reason: "concurrent dedup — another worker reserved within 7d" });
          continue;
        }
        const msg = e instanceof Error ? e.message : String(e);
        if (msg.includes("Serializ") || msg.includes("could not serialize")) {
          skippedCooldown++;
          details.push({ companyKey: t.companyKey, companyName: t.companyName, decision: "skip", reason: "concurrent serialization conflict — treated as cooldown" });
          continue;
        }
        errors.push(`${t.companyName}: reserve failed ${msg}`);
        details.push({ companyKey: t.companyKey, companyName: t.companyName, decision: "error", reason: `reserve failed: ${msg}` });
        continue;
      }

      if (!attemptId) continue;

      const html = buildPitchHtml({ companyName: t.companyName, slotsLeft, pricingUrl, postJobUrl, stats });
      const res = await sendEmail({
        to: t.email,
        subject: `Feature your job on Global Job Matching — ${slotsLeft} spots left`,
        html,
      });

      if (res.ok) {
        sent++;
        details.push({ companyKey: t.companyKey, companyName: t.companyName, decision: "sent", reason: `sent to ${t.email}` });
        await db.outreachAttempt
          .update({
            where: { id: attemptId },
            data: { status: "sent", sentAt: new Date(), error: null },
          })
          .catch(() => {});
        securityLog("admin.job_update", { meta: { outreach_sent: t.companyKey } });
      } else {
        const errMsg = res.error || "send failed";
        errors.push(`${t.companyName}: ${errMsg}`);
        details.push({ companyKey: t.companyKey, companyName: t.companyName, decision: "failed", reason: errMsg });
        await db.outreachAttempt
          .update({
            where: { id: attemptId },
            data: { status: "failed", error: errMsg },
          })
          .catch(() => {});
      }
    }

    return NextResponse.json({
      success: true,
      dryRun,
      sent,
      queued: targets.length,
      skippedNoEmail,
      skippedCooldown,
      stats: { totalJobs, featuredCount, slotsLeft, cooldownCutoff: cooldownCutoff.toISOString() },
      targets: targets.map((t) => t.companyName),
      details,
      errors: errors.slice(0, 5),
      note: dryRun
        ? "DRY RUN — no emails sent and no DB writes; existing outreach within 7d still blocks as in production"
        : skippedCooldown
          ? `${skippedCooldown} skipped due to 7-day cooldown`
          : skippedNoEmail
            ? "No stored prospect emails — add via admin"
            : "All queued processed",
    });
  } catch (e) {
    console.error("[cron/outreach]", e);
    return NextResponse.json({ success: false, error: e instanceof Error ? e.message : "Outreach failed" }, { status: 500 });
  }
}
