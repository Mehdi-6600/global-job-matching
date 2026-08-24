import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/messages - Get conversations
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const otherUserId = req.nextUrl.searchParams.get("with");

    if (otherUserId) {
      // Get messages with specific user
      const messages = await prisma.message.findMany({
        where: {
          OR: [
            { senderId: session.user.id, receiverId: otherUserId },
            { senderId: otherUserId, receiverId: session.user.id },
          ],
        },
        orderBy: { createdAt: "asc" },
        include: {
          sender: {
            select: { id: true, name: true, avatar: true },
          },
        },
      });

      // Mark as read
      await prisma.message.updateMany({
        where: {
          senderId: otherUserId,
          receiverId: session.user.id,
          read: false,
        },
        data: { read: true },
      });

      return NextResponse.json({ messages });
    }

    // Get all conversations
    const sentMessages = await prisma.message.findMany({
      where: { senderId: session.user.id },
      distinct: ["receiverId"],
      orderBy: { createdAt: "desc" },
      include: {
        receiver: {
          select: { id: true, name: true, avatar: true, title: true },
        },
      },
    });

    const receivedMessages = await prisma.message.findMany({
      where: { receiverId: session.user.id },
      distinct: ["senderId"],
      orderBy: { createdAt: "desc" },
      include: {
        sender: {
          select: { id: true, name: true, avatar: true, title: true },
        },
      },
    });

    // Combine and deduplicate
    const conversations = new Map();

    [...sentMessages, ...receivedMessages].forEach((msg) => {
      const otherUser = msg.senderId === session.user.id ? msg.receiver : msg.sender;
      if (!conversations.has(otherUser.id)) {
        conversations.set(otherUser.id, {
          user: otherUser,
          lastMessage: msg.content,
          lastMessageAt: msg.createdAt,
          unread: msg.receiverId === session.user.id && !msg.read ? 1 : 0,
        });
      } else if (msg.receiverId === session.user.id && !msg.read) {
        const conv = conversations.get(otherUser.id);
        conv.unread += 1;
      }
    });

    return NextResponse.json({ conversations: Array.from(conversations.values()) });
  } catch (error: any) {
    console.error("Messages error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch messages" },
      { status: 500 }
    );
  }
}

// POST /api/messages - Send message
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

    const message = await prisma.message.create({
      data: {
        senderId: session.user.id,
        receiverId,
        content: content.trim(),
      },
      include: {
        sender: {
          select: { id: true, name: true, avatar: true },
        },
      },
    });

    return NextResponse.json({ success: true, message });
  } catch (error: any) {
    console.error("Send message error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to send message" },
      { status: 500 }
    );
  }
}
