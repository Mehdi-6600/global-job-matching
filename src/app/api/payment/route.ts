import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  console.log("🔵 Payment API called");
  
  try {
    const body = await req.json();
    console.log("🔵 Body:", body);

    // فقط یک پاسخ ساده برگردون
    return NextResponse.json({
      success: true,
      message: "Payment API is working!",
      received: body,
    });
  } catch (error) {
    console.error("🔴 Error:", error);
    return NextResponse.json(
      { error: "Failed to process" },
      { status: 500 }
    );
  }
}
