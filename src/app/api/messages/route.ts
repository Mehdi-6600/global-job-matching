import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// GET - لیست مکالمات یا پیام‌های یک نفر
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const withUserId = searchParams.get("with");

  if (withUserId) {
    const messages = await prisma.message.findMany({
      where: {
        OR: [
          { senderId: session.user.id, receiverId: withUserId },
          { senderId: withUserId, receiverId: session.user.id },
        ],
      },
      orderBy: { createdAt: "asc" },
      include: {
        sender: { select: { id: true, name: true, avatar: true } },
        receiver: { select: { id: true, name: true, avatar: true } },
      },
    });

    // علامت‌گذاری پیام‌های دریافتی به عنوان خوانده‌شده
    await prisma.message.updateMany({
      where: {
        senderId: withUserId,
        receiverId: session.user.id,
        read: false,
      },
      data: { read: true },
    });

    return NextResponse.json({ messages });
  }

  // لیست مکالمات
  const allMessages = await prisma.message.findMany({
    where: {
      OR: [{ senderId: session.user.id }, { receiverId: session.user.id }],
    },
    orderBy: { createdAt: "desc" },
    include: {
      sender: { select: { id: true, name: true, avatar: true } },
      receiver: { select: { id: true, name: true, avatar: true } },
    },
  });

  const conversationsMap = new Map();
  allMessages.forEach((msg) => {
    const partnerId = msg.senderId === session.user.id ? msg.receiverId : msg.senderId;
    if (!conversationsMap.has(partnerId)) {
      conversationsMap.set(partnerId, {
        partner: msg.senderId === session.user.id ? msg.receiver : msg.sender,
        lastMessage: msg,
        unreadCount: 0,
      });
    }
    if (msg.receiverId === session.user.id && !msg.read) {
      conversationsMap.get(partnerId).unreadCount++;
    }
  });

  return NextResponse.json({
    conversations: Array.from(conversationsMap.values()),
  });
}

// POST - ارسال پیام
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { receiverId, content } = await req.json();

    if (!receiverId || !content?.trim()) {
      return NextResponse.json(
        { error: "Receiver and content required" },
        { status: 400 }
      );
    }

    if (receiverId === session.user.id) {
      return NextResponse.json(
        { error: "Cannot message yourself" },
        { status: 400 }
      );
    }

    const message = await prisma.message.create({
      data: {
        senderId: session.user.id,
        receiverId,
        content: content.trim(),
      },
      include: {
        sender: { select: { id: true, name: true, avatar: true } },
        receiver: { select: { id: true, name: true, avatar: true } },
      },
    });

    return NextResponse.json({ message }, { status: 201 });
  } catch (error) {
    console.error("Send message error:", error);
    return NextResponse.json(
      { error: "Failed to send message" },
      { status: 500 }
    );
  }
}
