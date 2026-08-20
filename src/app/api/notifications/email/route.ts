import { NextRequest, NextResponse } from "next/server";

// Requires RESEND_API_KEY env variable
// Install: npm install resend
// Or use any SMTP provider (Nodemailer, SendGrid, etc.)

export async function POST(req: NextRequest) {
  try {
    const { to, subject, html, text } = await req.json();

    if (!to || !subject || (!html && !text)) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      // Fallback: log to console in dev, return success so UI does not break
      console.log("[EMAIL] RESEND_API_KEY not set. Would send:");
      console.log({ to, subject, text: text || "HTML email" });
      return NextResponse.json({
        success: true,
        warning: "RESEND_API_KEY not configured — email logged to console only",
      });
    }

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM || "GlobalJob <notifications@yourdomain.com>",
        to,
        subject,
        html,
        text,
      }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || "Resend API error");
    }

    const data = await res.json();
    return NextResponse.json({ success: true, id: data.id });
  } catch (error: any) {
    console.error("Email send failed:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to send email" },
      { status: 500 }
    );
  }
}
