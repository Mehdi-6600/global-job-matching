import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

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

// GET - دریافت پیام‌های یک مکالمه یا لیست مکالمات
export async function GET(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const withUserId = searchParams.get("with");

    // ---------------------------------------------------------
    // دریافت پیام‌های بین کاربر فعلی و یک کاربر مشخص
    // ---------------------------------------------------------

    if (withUserId) {
      if (withUserId === session.user.id) {
        return NextResponse.json(
          { error: "Cannot message yourself" },
          { status: 400 }
        );
      }

      const messages = await prisma.message.findMany({
        where: {
          OR: [
            {
              senderId: session.user.id,
              receiverId: withUserId,
            },
            {
              senderId: withUserId,
              receiverId: session.user.id,
            },
          ],
        },
        orderBy: {
          createdAt: "asc",
        },
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              image: true,
            },
          },
          receiver: {
            select: {
              id: true,
              name: true,
              image: true,
            },
          },
        },
      });

      // پیام‌های دریافتی را خوانده‌شده می‌کنیم
      await prisma.message.updateMany({
        where: {
          senderId: withUserId,
          receiverId: session.user.id,
          read: false,
        },
        data: {
          read: true,
        },
      });

      const serializedMessages = messages.map((message) => ({
        ...message,
        sender: serializeUser(message.sender),
        receiver: serializeUser(message.receiver),
      }));

      return NextResponse.json({
        messages: serializedMessages,
      });
    }

    // ---------------------------------------------------------
    // دریافت تمام پیام‌های کاربر برای ساخت لیست مکالمات
    // ---------------------------------------------------------

    const allMessages = await prisma.message.findMany({
      where: {
        OR: [
          {
            senderId: session.user.id,
          },
          {
            receiverId: session.user.id,
          },
        ],
      },
      orderBy: {
        createdAt: "desc",
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
        receiver: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
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
      const isSender =
        message.senderId === session.user.id;

      const partnerId = isSender
        ? message.receiverId
        : message.senderId;

      if (!conversationsMap.has(partnerId)) {
        const partner = isSender
          ? message.receiver
          : message.sender;

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

      if (
        message.receiverId === session.user.id &&
        !message.read
      ) {
        const conversation =
          conversationsMap.get(partnerId);

        if (conversation) {
          conversation.unreadCount += 1;
        }
      }
    }

    return NextResponse.json({
      conversations: Array.from(
        conversationsMap.values()
      ),
    });
  } catch (error) {
    console.error(
      "Get messages error:",
      error
    );

    return NextResponse.json(
      {
        error: "Failed to load messages",
      },
      {
        status: 500,
      }
    );
  }
}

// POST - ارسال پیام
export async function POST(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json();

    const receiverId =
      typeof body.receiverId === "string"
        ? body.receiverId.trim()
        : "";

    const content =
      typeof body.content === "string"
        ? body.content.trim()
        : "";

    if (!receiverId || !content) {
      return NextResponse.json(
        {
          error:
            "Receiver and content are required",
        },
        {
          status: 400,
        }
      );
    }

    if (receiverId === session.user.id) {
      return NextResponse.json(
        {
          error: "Cannot message yourself",
        },
        {
          status: 400,
        }
      );
    }

    // بررسی وجود گیرنده
    const receiver = await prisma.user.findUnique({
      where: {
        id: receiverId,
      },
      select: {
        id: true,
      },
    });

    if (!receiver) {
      return NextResponse.json(
        {
          error: "Receiver not found",
        },
        {
          status: 404,
        }
      );
    }

    const message = await prisma.message.create({
      data: {
        senderId: session.user.id,
        receiverId,
        content,
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
        receiver: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
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
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error(
      "Send message error:",
      error
    );

    return NextResponse.json(
      {
        error: "Failed to send message",
      },
      {
        status: 500,
      }
    );
  }
}
