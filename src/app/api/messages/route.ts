import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { ratelimit } from "@/lib/ratelimit";
import { z } from "zod";

function serializeUser(user: {
  id: string;
  name: string | null;
  image: string | null;
}) {
  return {
    id: user.id,
    name: user.name,
    avatar: user.image,
  };
}

const postSchema = z.object({
  receiverId: z.string().min(1).max(64),
  content: z.string().min(1).max(5000),
});

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const withUserId = searchParams.get("with");

    if (withUserId) {
      if (withUserId === session.user.id) {
        return NextResponse.json(
          { error: "Cannot message yourself" },
          { status: 400 }
        );
      }

      const messages = await db.message.findMany({
        where: {
          OR: [
            { senderId: session.user.id, receiverId: withUserId },
            { senderId: withUserId, receiverId: session.user.id },
          ],
        },
        orderBy: { createdAt: "asc" },
        include: {
          sender: { select: { id: true, name: true, image: true } },
          receiver: { select: { id: true, name: true, image: true } },
        },
      });

      await db.message.updateMany({
        where: {
          senderId: withUserId,
          receiverId: session.user.id,
          read: false,
        },
        data: { read: true },
      });

      return NextResponse.json({
        messages: messages.map((message) => ({
          ...message,
          sender: serializeUser(message.sender),
          receiver: serializeUser(message.receiver),
        })),
      });
    }

    const allMessages = await db.message.findMany({
      where: {
        OR: [
          { senderId: session.user.id },
          { receiverId: session.user.id },
        ],
      },
      orderBy: { createdAt: "desc" },
      include: {
        sender: { select: { id: true, name: true, image: true } },
        receiver: { select: { id: true, name: true, image: true } },
      },
    });

    const conversationsMap = new Map<
      string,
      {
        partner: { id: string; name: string | null; avatar: string | null };
        lastMessage: unknown;
        unreadCount: number;
      }
    >();

    for (const message of allMessages) {
      const isSender = message.senderId === session.user.id;
      const partnerId = isSender ? message.receiverId : message.senderId;

      if (!conversationsMap.has(partnerId)) {
        const partner = isSender ? message.receiver : message.sender;
        conversationsMap.set(partnerId, {
          partner: serializeUser(partner),
          lastMessage: {
            ...message,
            sender: serializeUser(message.sender),
            receiver: serializeUser(message.receiver),
          },
          unreadCount: 0,
        });
      }

      if (message.receiverId === session.user.id && !message.read) {
        const conversation = conversationsMap.get(partnerId);
        if (conversation) conversation.unreadCount += 1;
      }
    }

    return NextResponse.json({
      conversations: Array.from(conversationsMap.values()),
    });
  } catch (error) {
    console.error("Get messages error:", error);
    return NextResponse.json(
      { error: "Failed to load messages" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const { success } = await ratelimit.limit(
      `messages_post_${session.user.id}_${ip}`
    );
    if (!success) {
      return NextResponse.json(
        { error: "Too many messages. Please slow down." },
        { status: 429 }
      );
    }

    const body = await req.json();
    const parsed = postSchema.safeParse({
      receiverId:
        typeof body.receiverId === "string" ? body.receiverId.trim() : "",
      content: typeof body.content === "string" ? body.content.trim() : "",
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Receiver and content are required (max 5000 chars)" },
        { status: 400 }
      );
    }

    const { receiverId, content } = parsed.data;

    if (receiverId === session.user.id) {
      return NextResponse.json(
        { error: "Cannot message yourself" },
        { status: 400 }
      );
    }

    const receiver = await db.user.findUnique({
      where: { id: receiverId },
      select: { id: true },
    });

    if (!receiver) {
      return NextResponse.json(
        { error: "Receiver not found" },
        { status: 404 }
      );
    }

    const message = await db.message.create({
      data: {
        senderId: session.user.id,
        receiverId,
        content,
      },
      include: {
        sender: { select: { id: true, name: true, image: true } },
        receiver: { select: { id: true, name: true, image: true } },
      },
    });

    return NextResponse.json(
      {
        message: {
          ...message,
          sender: serializeUser(message.sender),
          receiver: serializeUser(message.receiver),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Send message error:", error);
    return NextResponse.json(
      { error: "Failed to send message" },
      { status: 500 }
    );
  }
}
