import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import { ratelimit } from "@/lib/ratelimit";
import {
  buildEmployerEmailHtml,
  sendEmail,
} from "@/lib/email";
import { getRequestIp } from "@/lib/client-ip";

const schema = z.object({
  mode: z.enum(["send", "draft"]),
  subject: z.string().min(5).max(200).optional(),
  message: z.string().min(30).max(5000),
  confirmSend: z.boolean().optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: jobId } = await params;
    if (!jobId) {
      return NextResponse.json({ error: "Job ID required" }, { status: 400 });
    }

    const ip = getRequestIp(req);
    const { success } = await ratelimit.limit(
      `contact_employer_${session.user.id}_${ip}`
    );
    if (!success) {
      return NextResponse.json(
        { error: "Too many requests. Please wait." },
        { status: 429 }
      );
    }

    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { mode, message, confirmSend } = parsed.data;

    if (mode === "send" && confirmSend !== true) {
      return NextResponse.json(
        {
          error:
            "Please confirm you want to send this email (confirmSend: true).",
        },
        { status: 400 }
      );
    }

    const job = await db.job.findUnique({
      where: { id: jobId },
      include: {
        company: {
          select: {
            id: true,
            name: true,
            email: true,
            ownerId: true,
            owner: { select: { id: true, name: true, email: true } },
          },
        },
        postedBy: { select: { id: true, name: true, email: true } },
      },
    });

    if (!job || job.status !== "active") {
      return NextResponse.json(
        { error: "Job not found or not active" },
        { status: 404 }
      );
    }

    const applicant = await db.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        profile: { select: { phone: true, location: true } },
      },
    });

    if (!applicant?.email) {
      return NextResponse.json(
        { error: "Your account needs a valid email" },
        { status: 400 }
      );
    }

    const employerEmail =
      job.company?.email ||
      job.company?.owner?.email ||
      job.postedBy?.email ||
      null;

    const employerName =
      job.company?.owner?.name || job.postedBy?.name || null;

    const companyName = job.company?.name || "the company";
    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      "https://global-job-matching.vercel.app";
    const jobUrl = `${appUrl}/jobs/${job.id}`;

    const subject =
      parsed.data.subject?.trim() ||
      `Application interest: ${job.title} at ${companyName}`;

    const draftText = `To: ${employerEmail || "(no employer email on file)"}
Subject: ${subject}

Hello${employerName ? ` ${employerName}` : ""},

My name is ${applicant.name || "a candidate"} (${applicant.email}).
I am writing regarding the role "${job.title}" at ${companyName}.

${message}

Job link: ${jobUrl}

Best regards,
${applicant.name || applicant.email}`;

    if (mode === "draft") {
      return NextResponse.json({
        success: true,
        mode: "draft",
        draft: draftText,
        employerEmail: employerEmail,
        subject,
        hasEmployerEmail: Boolean(employerEmail),
      });
    }

    if (!employerEmail) {
      return NextResponse.json(
        {
          error:
            "This job has no employer email on file. Use Draft and send manually, or message via the platform.",
          draft: draftText,
        },
        { status: 422 }
      );
    }

    const html = buildEmployerEmailHtml({
      employerName,
      applicantName: applicant.name || applicant.email,
      applicantEmail: applicant.email,
      jobTitle: job.title,
      companyName,
      message,
      jobUrl,
    });

    const result = await sendEmail({
      to: employerEmail,
      subject,
      html,
      replyTo: applicant.email,
    });

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error, draft: draftText },
        { status: 502 }
      );
    }

    await db.notification.create({
      data: {
        userId: session.user.id,
        type: "application",
        title: "Email sent to employer",
        message: `Your message about "${job.title}" was sent to ${employerEmail}.`,
        actionUrl: `/jobs/${job.id}`,
      },
    });

    const employerUserId =
      job.company?.ownerId || job.postedById || null;
    if (employerUserId) {
      await db.notification.create({
        data: {
          userId: employerUserId,
          type: "application",
          title: "New candidate email",
          message: `${applicant.name || applicant.email} contacted you about "${job.title}". Check your email inbox.`,
          actionUrl: `/jobs/${job.id}`,
        },
      });
    }

    return NextResponse.json({
      success: true,
      mode: "send",
      sentTo: employerEmail,
      subject,
    });
  } catch (error) {
    console.error("contact-employer error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
