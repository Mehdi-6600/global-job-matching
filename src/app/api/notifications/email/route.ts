import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Resend } from "resend";
import { env } from "@/lib/env";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Please sign in to continue" },
        { status: 401 }
      );
    }

    if (!env.RESEND_API_KEY || !env.RESEND_FROM_EMAIL) {
      return NextResponse.json(
        {
          error:
            "Email service is not configured. Set RESEND_API_KEY and RESEND_FROM_EMAIL.",
          code: "EMAIL_NOT_CONFIGURED",
        },
        { status: 503 }
      );
    }

    const resend = new Resend(env.RESEND_API_KEY);
    const fromEmail = env.RESEND_FROM_EMAIL;

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const userId =
      typeof body === "object" &&
      body !== null &&
      "userId" in body &&
      typeof (body as { userId: unknown }).userId === "string"
        ? (body as { userId: string }).userId
        : "";

    const subject =
      typeof body === "object" &&
      body !== null &&
      "subject" in body &&
      typeof (body as { subject: unknown }).subject === "string"
        ? (body as { subject: string }).subject
        : undefined;

    const template =
      typeof body === "object" &&
      body !== null &&
      "template" in body &&
      typeof (body as { template: unknown }).template === "string"
        ? (body as { template: string }).template
        : "welcome";

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 }
      );
    }

    // Users may only email themselves; ADMIN/OWNER may email others
    if (userId !== session.user.id) {
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { role: true },
      });

      const role = (user?.role || "").toUpperCase();
      if (role !== "ADMIN" && role !== "OWNER") {
        return NextResponse.json(
          { error: "You are not allowed to send email for other users" },
          { status: 403 }
        );
      }
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true },
    });

    if (!targetUser?.email) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    const appUrl = env.NEXT_PUBLIC_APP_URL;
    const displayName = targetUser.name || "there";

    const templates: Record<string, { subject: string; html: string }> = {
      "job-alert": {
        subject: "New jobs matching your preferences",
        html: `<h1>Hi ${displayName}</h1>
               <p>We found new jobs that match your search.</p>
               <a href="${appUrl}/jobs">View jobs</a>`,
      },
      welcome: {
        subject: "Welcome to Global Job Matching",
        html: `<h1>Hi ${displayName}</h1>
               <p>Thanks for joining Global Job Matching.</p>
               <p>Complete your profile to get started.</p>
               <a href="${appUrl}/dashboard">Go to dashboard</a>`,
      },
    };

    const selectedTemplate = templates[template] || templates.welcome;

    await resend.emails.send({
      from: fromEmail,
      to: targetUser.email,
      subject: subject || selectedTemplate.subject,
      html: selectedTemplate.html,
    });

    return NextResponse.json({
      success: true,
      message: "Email sent successfully",
    });
  } catch (error) {
    console.error("Email sending error:", error);
    return NextResponse.json(
      { error: "Failed to send email" },
      { status: 500 }
    );
  }
}
