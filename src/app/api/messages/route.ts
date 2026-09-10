import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { strictRatelimit } from "@/lib/ratelimit";
import {
  messageCreateSchema,
  messageQuerySchema,
} from "@/lib/validation/message";
import { getRequestIp } from "@/lib/client-ip";
import { canMessageUser } from "@/lib/ownership";
import { parseListLimit, LIST_LIMITS } from "@/lib/pagination";

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

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ip = getRequestIp(req);
    const { success } = await strictRatelimit.limit(
      `messages_get_${session.user.id}_${ip}`
    );
    if (!success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const { searchParams } = new URL(req.url);
    const rawWith = searchParams.get("with");

    if (rawWith) {
      const parsed = messageQuerySchema.safeParse({ withUserId: rawWith });
      if (!parsed.success) {
        return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
      }

      const withUserId = parsed.data.withUserId;

      if (withUserId === session.user.id) {
        return NextResponse.json(
          { error: "Cannot message yourself" },
          { status: 400 }
        );
      }

      const otherUser = await db.user.findUnique({
        where: { id: withUserId },
        select: { id: true, name: true, image: true },
      });

      if (!otherUser) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }

      const take = parseListLimit(
        searchParams.get("limit"),
        LIST_LIMITS.messagesThread
      );

      const messages = await db.message.findMany({
        where: {
          OR: [
            { senderId: session.user.id, receiverId: withUserId },
            { senderId: withUserId, receiverId: session.user.id },
          ],
        },
        orderBy: { createdAt: "asc" },
        take,
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
        partner: serializeUser(otherUser),
        messages: messages.map((message) => ({
          ...message,
          sender: serializeUser(message.sender),
          receiver: serializeUser(message.receiver),
        })),
        limit: take,
      });
    }

    const take = parseListLimit(
      searchParams.get("limit"),
      LIST_LIMITS.messagesInbox
    );

    const allMessages = await db.message.findMany({
      where: {
        OR: [
          { senderId: session.user.id },
          { receiverId: session.user.id },
        ],
      },
      orderBy: { createdAt: "desc" },
      take,
      include: {
        sender: { select: { id: true, name: true, image: true } },
        receiver: { select: { id: true, name: true, image: true } },
      },
    });

    const conversationsMap = new Map<
      string,
      {
        partner: {
          id: string;
          name: string | null;
          avatar: string | null;
        };
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
      limit: take,
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

    const ip = getRequestIp(req);
    const { success } = await strictRatelimit.limit(
      `messages_post_${session.user.id}_${ip}`
    );
    if (!success) {
      return NextResponse.json(
        { error: "Too many messages. Please slow down." },
        { status: 429 }
      );
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = messageCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid input",
          details: parsed.error.flatten().fieldErrors,
        },
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

    const allowed = await canMessageUser(
      db,
      session.user.id,
      receiverId,
      session.user.role
    );

    if (!allowed) {
      return NextResponse.json(
        {
          error:
            "You can only message users related to your jobs/applications, or continue an existing conversation.",
          code: "MESSAGE_NOT_ALLOWED",
        },
        { status: 403 }
      );
    }

    const receiver = await db.user.findUnique({
      where: { id: receiverId },
      select: { id: true, name: true, image: true },
    });

    if (!receiver) {
      return NextResponse.json({ error: "Receiver not found" }, { status: 404 });
    }

    const result = await db.$transaction(async (tx) => {
      const message = await tx.message.create({
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

      await tx.notification.create({
        data: {
          userId: receiverId,
          type: "message",
          title: "New Message",
          message: `${session.user.name || "Someone"} sent you a new message.`,
          actionUrl: `/messages?with=${session.user.id}`,
        },
      });

      return message;
    });

    return NextResponse.json(
      {
        success: true,
        message: {
          ...result,
          sender: serializeUser(result.sender),
          receiver: serializeUser(result.receiver),
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
