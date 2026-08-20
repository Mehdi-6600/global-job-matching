// src/app/api/payment/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { planId, currency, walletAddress, txHash, amount } = body;

    if (!planId || !currency || !txHash) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // ذخیره تراکنش در دیتابیس
    const transaction = await db.transaction.create({
      data: {
        userId: session.user.id,
        planId,
        amount,
        currency,
        walletAddress,
        txHash,
        status: "pending",
      },
    });

    return NextResponse.json({
      success: true,
      message: "Transaction recorded. Waiting for confirmation.",
      transaction,
    });
  } catch (error) {
    console.error("Payment error:", error);
    return NextResponse.json(
      { error: "Failed to process payment" },
      { status: 500 }
    );
  }
}
