import { NextRequest, NextResponse } from "next/server";
import { Notification } from "@/lib/notifications";

// In-memory store (replace with DB in production)
let notifications: Notification[] = [];

export async function GET() {
  return NextResponse.json({ notifications });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const notif: Notification = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      type: body.type,
      title: body.title,
      message: body.message,
      read: false,
      createdAt: new Date().toISOString(),
      data: body.data,
    };
    notifications.unshift(notif);
    notifications = notifications.slice(0, 100);
    return NextResponse.json({ success: true, notification: notif });
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid request" },
      { status: 400 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { id, read } = await req.json();
    notifications = notifications.map((n) =>
      n.id === id ? { ...n, read } : n
    );
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid request" },
      { status: 400 }
    );
  }
}
