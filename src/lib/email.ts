import { Resend } from "resend";

let resendClient: Resend | null = null;

function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  if (!resendClient) resendClient = new Resend(key);
  return resendClient;
}

export async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const resend = getResend();
  const from = process.env.RESEND_FROM_EMAIL;

  if (!resend || !from) {
    return {
      ok: false,
      error: "Email service is not configured (RESEND_API_KEY / RESEND_FROM_EMAIL)",
    };
  }

  try {
    await resend.emails.send({
      from,
      to: params.to,
      subject: params.subject,
      html: params.html,
      replyTo: params.replyTo,
    });
    return { ok: true };
  } catch (e) {
    console.error("sendEmail error:", e);
    return { ok: false, error: "Failed to send email" };
  }
}

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildEmployerEmailHtml(opts: {
  employerName?: string | null;
  applicantName: string;
  applicantEmail: string;
  jobTitle: string;
  companyName: string;
  message: string;
  jobUrl?: string;
}): string {
  const safeMessage = escapeHtml(opts.message).replace(/\n/g, "<br/>");
  return `
<!DOCTYPE html>
<html>
<body style="font-family:Arial,sans-serif;line-height:1.6;color:#111;max-width:640px;margin:0 auto;padding:24px;">
  <p>Hello${opts.employerName ? ` ${escapeHtml(opts.employerName)}` : ""},</p>
  <p>
    <strong>${escapeHtml(opts.applicantName)}</strong>
    (${escapeHtml(opts.applicantEmail)}) is reaching out about the role
    <strong>${escapeHtml(opts.jobTitle)}</strong>
    at <strong>${escapeHtml(opts.companyName)}</strong>
    via Global Job Matching.
  </p>
  <div style="margin:20px 0;padding:16px;background:#f4f4f5;border-radius:8px;">
    ${safeMessage}
  </div>
  ${
    opts.jobUrl
      ? `<p><a href="${escapeHtml(opts.jobUrl)}">View job posting</a></p>`
      : ""
  }
  <p style="color:#666;font-size:13px;">
    You can reply directly to this email to contact the applicant.
  </p>
</body>
</html>`;
}
