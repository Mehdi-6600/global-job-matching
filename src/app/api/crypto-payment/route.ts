import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { emailRatelimit } from "@/lib/ratelimit";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { planId, amount, currency, txHash, cryptoType } = await req.json();

    if (!planId || !amount || !txHash || !cryptoType) {
      return NextResponse.json({ error: "All fields required" }, { status: 400 });
    }

    const { success } = await emailRatelimit.limit(`crypto:${session.user.id}`);
    if (!success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const transaction = await prisma.transaction.create({
      data: {
        userId: session.user.id,
        planId,
        amount: parseInt(amount),
        currency,
        txHash,
        paymentMethod: "crypto",
        status: "pending",
      },
    });

    // Notify admin
    if (process.env.OWNER_EMAIL) {
      const { Resend } = await import("resend");
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL!,
        to: process.env.OWNER_EMAIL,
        subject: "New Crypto Payment Pending",
        html: `
          <h2>New Crypto Payment</h2>
          <p>User: ${session.user.email}</p>
          <p>Plan: ${planId}</p>
          <p>Amount: ${amount} ${currency}</p>
          <p>Crypto: ${cryptoType}</p>
          <p>TX Hash: ${txHash}</p>
          <p>Verify and update status in admin panel.</p>
        `,
      });
    }

    return NextResponse.json({ transaction }, { status: 201 });
  } catch (error) {
    console.error("Crypto payment error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
