import { NextRequest, NextResponse } from "next/server";
import { ratelimit } from "@/lib/ratelimit";

export async function POST(req: NextRequest) {
  try {
    const { name, email, subject, message } = await req.json();

    if (
      !name?.trim() ||
      !email?.trim() ||
      !subject?.trim() ||
      !message?.trim()
    ) {
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 }
      );
    }

    if (!email.includes("@") || !email.includes(".")) {
      return NextResponse.json(
        { error: "Valid email is required" },
        { status: 400 }
      );
    }

    const { success } = await ratelimit.limit(
      `contact:${email.toLowerCase().trim()}`
    );
    if (!success) {
      return NextResponse.json(
        { error: "Too many requests. Please wait a minute." },
        { status: 429 }
      );
    }

    // Optional email via Resend
    if (process.env.RESEND_API_KEY && process.env.OWNER_EMAIL) {
      try {
        const { Resend } = await import("resend");
        const resend = new Resend(process.env.RESEND_API_KEY);
        await resend.emails.send({
          from:
            process.env.RESEND_FROM_EMAIL ||
            "onboarding@resend.dev",
          to: process.env.OWNER_EMAIL,
          subject: `Contact Form: ${subject}`,
          replyTo: email,
          html: `
            <h2>New Contact Message</h2>
            <p><strong>Name:</strong> ${name}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Subject:</strong> ${subject}</p>
            <p><strong>Message:</strong></p>
            <p>${String(message).replace(/\n/g, "<br>")}</p>
          `,
        });
      } catch (mailErr) {
        console.error("Resend error (message still accepted):", mailErr);
      }
    } else {
      console.log("[Contact form]", { name, email, subject, message });
    }

    return NextResponse.json(
      { message: "Message sent successfully" },
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
