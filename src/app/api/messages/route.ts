import {
  NextRequest,
  NextResponse,
} from "next/server";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { ratelimit } from "@/lib/ratelimit";

import {
  messageCreateSchema,
  messageQuerySchema,
} from "@/lib/validation/message";

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

function getClientIp(
  req: NextRequest
): string {
  return (
    req.headers
      .get("x-forwarded-for")
      ?.split(",")[0]
      ?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

export async function GET(
  req: NextRequest
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const ip = getClientIp(req);

    const { success } =
      await ratelimit.limit(
        `messages_get_${session.user.id}_${ip}`
      );

    if (!success) {
      return NextResponse.json(
        {
          error:
            "Too many requests. Please try again later.",
        },
        { status: 429 }
      );
    }

    const {
      searchParams,
    } = new URL(req.url);

    const rawWithUserId =
      searchParams.get("with");

    /*
     * --------------------------------------------------
     * SINGLE CONVERSATION
     * --------------------------------------------------
     */
    if (rawWithUserId) {
      const parsed =
        messageQuerySchema.safeParse({
          withUserId:
            rawWithUserId,
        });

      if (!parsed.success) {
        return NextResponse.json(
          {
            error:
              "Invalid user ID",
          },
          { status: 400 }
        );
      }

      const withUserId =
        parsed.data.withUserId;

      if (
        withUserId ===
        session.user.id
      ) {
        return NextResponse.json(
          {
            error:
              "Cannot message yourself",
          },
          { status: 400 }
        );
      }

      /*
       * Verify that the other user actually exists.
       */
      const otherUser =
        await db.user.findUnique({
          where: {
            id: withUserId,
          },

          select: {
            id: true,
            name: true,
            image: true,
          },
        });

      if (!otherUser) {
        return NextResponse.json(
          {
            error:
              "User not found",
          },
          { status: 404 }
        );
      }

      /*
       * Only messages where the current user is
       * sender OR receiver are returned.
       *
       * This is the critical ownership condition.
       */
      const messages =
        await db.message.findMany({
          where: {
            OR: [
              {
                senderId:
                  session.user.id,

                receiverId:
                  withUserId,
              },

              {
                senderId:
                  withUserId,

                receiverId:
                  session.user.id,
              },
            ],
          },

          orderBy: {
            createdAt: "asc",
          },

          take: 200,

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

      /*
       * Mark ONLY messages sent by the other user
       * to the current user as read.
       */
      await db.message.updateMany({
        where: {
          senderId:
            withUserId,

          receiverId:
            session.user.id,

          read: false,
        },

        data: {
          read: true,
        },
      });

      return NextResponse.json({
        partner:
          serializeUser(otherUser),

        messages:
          messages.map(
            (message) => ({
              ...message,

              sender:
                serializeUser(
                  message.sender
                ),

              receiver:
                serializeUser(
                  message.receiver
                ),
            })
          ),
      });
    }

    /*
     * --------------------------------------------------
     * CONVERSATION LIST
     * --------------------------------------------------
     */

    const allMessages =
      await db.message.findMany({
        where: {
          OR: [
            {
              senderId:
                session.user.id,
            },

            {
              receiverId:
                session.user.id,
            },
          ],
        },

        orderBy: {
          createdAt: "desc",
        },

        take: 500,

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

    const conversationsMap =
      new Map<
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

    for (
      const message of allMessages
    ) {
      const isSender =
        message.senderId ===
        session.user.id;

      const partnerId =
        isSender
          ? message.receiverId
          : message.senderId;

      if (
        !conversationsMap.has(
          partnerId
        )
      ) {
        const partner =
          isSender
            ? message.receiver
            : message.sender;

        conversationsMap.set(
          partnerId,
          {
            partner:
              serializeUser(
                partner
              ),

            lastMessage: {
              ...message,

              sender:
                serializeUser(
                  message.sender
                ),

              receiver:
                serializeUser(
                  message.receiver
                ),
            },

            unreadCount: 0,
          }
        );
      }

      if (
        message.receiverId ===
          session.user.id &&
        !message.read
      ) {
        const conversation =
          conversationsMap.get(
            partnerId
          );

        if (conversation) {
          conversation.unreadCount +=
            1;
        }
      }
    }

    return NextResponse.json({
      conversations:
        Array.from(
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
        error:
          "Failed to load messages",
      },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const ip = getClientIp(req);

    const { success } =
      await ratelimit.limit(
        `messages_post_${session.user.id}_${ip}`
      );

    if (!success) {
      return NextResponse.json(
        {
          error:
            "Too many messages. Please slow down.",
        },
        { status: 429 }
      );
    }

    let body: unknown;

    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        {
          error:
            "Invalid JSON body",
        },
        { status: 400 }
      );
    }

    const parsed =
      messageCreateSchema.safeParse(
        body
      );

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid input",

          details:
            parsed.error.flatten()
              .fieldErrors,
        },
        { status: 400 }
      );
    }

    const {
      receiverId,
      content,
    } = parsed.data;

    if (
      receiverId ===
      session.user.id
    ) {
      return NextResponse.json(
        {
          error:
            "Cannot message yourself",
        },
        { status: 400 }
      );
    }

    /*
     * Verify receiver exists.
     */
    const receiver =
      await db.user.findUnique({
        where: {
          id: receiverId,
        },

        select: {
          id: true,
          name: true,
          image: true,
        },
      });

    if (!receiver) {
      return NextResponse.json(
        {
          error:
            "Receiver not found",
        },
        { status: 404 }
      );
    }

    /*
     * Create message and notification together.
     *
     * If notification creation fails,
     * the message is rolled back.
     */
    const result =
      await db.$transaction(
        async (tx) => {
          const message =
            await tx.message.create({
              data: {
                senderId:
                  session.user.id,

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

          await tx.notification.create({
            data: {
              userId:
                receiverId,

              type:
                "message",

              title:
                "New Message",

              message:
                `${session.user.name || "Someone"} sent you a new message.`,

              actionUrl:
                `/messages?with=${session.user.id}`,
            },
          });

          return message;
        }
      );

    return NextResponse.json(
      {
        success: true,

        message: {
          ...result,

          sender:
            serializeUser(
              result.sender
            ),

          receiver:
            serializeUser(
              result.receiver
            ),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(
      "Send message error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Failed to send message",
      },
      { status: 500 }
    );
  }
}
