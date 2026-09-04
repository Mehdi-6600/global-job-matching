import { NextRequest, NextResponse } from "next/server";
import { ratelimit } from "@/lib/ratelimit";
import { contactSchema } from "@/lib/validation/contact";
import { getRequestIp } from "@/lib/client-ip";

function escapeHtml(input: string) {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function POST(req: NextRequest) {
  try {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = contactSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { name, email, subject, message } = parsed.data;
    const emailKey = email.toLowerCase();

    const ip = getRequestIp(req);

    const { success } = await ratelimit.limit(`contact_${emailKey}_${ip}`);
    if (!success) {
      return NextResponse.json(
        { error: "Too many requests. Please wait a minute." },
        { status: 429 }
      );
    }

    if (!process.env.RESEND_API_KEY || !process.env.OWNER_EMAIL) {
      console.error("[Contact] RESEND_API_KEY or OWNER_EMAIL missing");
      return NextResponse.json(
        {
          error:
            "Contact email is not configured on the server. Please try again later.",
        },
        { status: 503 }
      );
    }

    try {
      const { Resend } = await import("resend");
      const resend = new Resend(process.env.RESEND_API_KEY);
      const result = await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev",
        to: process.env.OWNER_EMAIL,
        subject: `Contact Form: ${subject.slice(0, 120)}`,
        replyTo: email,
        html: `
          <h2>New Contact Message</h2>
          <p><strong>Name:</strong> ${escapeHtml(name)}</p>
          <p><strong>Email:</strong> ${escapeHtml(email)}</p>
          <p><strong>Subject:</strong> ${escapeHtml(subject)}</p>
          <p><strong>Message:</strong></p>
          <p>${escapeHtml(message).replace(/\n/g, "<br>")}</p>
        `,
      });

      if (result.error) {
        console.error("Resend API error:", result.error);
        return NextResponse.json(
          { error: "Failed to deliver message. Please try again later." },
          { status: 502 }
        );
      }
    } catch (mailErr) {
      console.error("Resend error:", mailErr);
      return NextResponse.json(
        { error: "Failed to send message. Please try again later." },
        { status: 502 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Message sent successfully",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Contact API error:", error);
    return NextResponse.json(
      { error: "Failed to send message. Please try again later." },
      { status: 500 }
    );
  }
}
