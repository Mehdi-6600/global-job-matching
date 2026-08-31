import {
  NextRequest,
  NextResponse,
} from "next/server";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { ratelimit } from "@/lib/ratelimit";

import {
  notificationPatchSchema,
  notificationDeleteSchema,
} from "@/lib/validation/notification";

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
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const ip = getClientIp(req);

    const { success } =
      await ratelimit.limit(
        `notifications_get_${session.user.id}_${ip}`
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

    const notifications =
      await db.notification.findMany({
        where: {
          userId: session.user.id,
        },

        orderBy: {
          createdAt: "desc",
        },

        take: 50,
      });

    const unreadCount =
      notifications.filter(
        (notification) =>
          !notification.read
      ).length;

    return NextResponse.json({
      notifications,
      unreadCount,
    });
  } catch (error) {
    console.error(
      "Fetch notifications error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Failed to fetch notifications",
      },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest
) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const ip = getClientIp(req);

    const { success } =
      await ratelimit.limit(
        `notifications_patch_${session.user.id}_${ip}`
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

    let body: unknown;

    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        {
          error: "Invalid JSON body",
        },
        { status: 400 }
      );
    }

    const parsed =
      notificationPatchSchema.safeParse(
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
      id,
      readAll,
    } = parsed.data;

    if (readAll === true) {
      const result =
        await db.notification.updateMany({
          where: {
            userId: session.user.id,
            read: false,
          },

          data: {
            read: true,
          },
        });

      return NextResponse.json({
        success: true,
        message:
          "All notifications marked as read",
        updatedCount:
          result.count,
      });
    }

    if (!id) {
      return NextResponse.json(
        {
          error:
            "Notification ID required",
        },
        { status: 400 }
      );
    }

    /*
     * The userId condition is deliberately kept
     * inside the database query.
     *
     * This prevents one user from marking another
     * user's notification as read even if they know
     * its ID.
     */
    const result =
      await db.notification.updateMany({
        where: {
          id,
          userId: session.user.id,
        },

        data: {
          read: true,
        },
      });

    if (result.count === 0) {
      return NextResponse.json(
        {
          error:
            "Notification not found",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message:
        "Notification marked as read",
    });
  } catch (error) {
    console.error(
      "Update notification error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Failed to update notification",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest
) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const ip = getClientIp(req);

    const { success } =
      await ratelimit.limit(
        `notifications_delete_${session.user.id}_${ip}`
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

    const { searchParams } =
      new URL(req.url);

    const id =
      searchParams.get("id");

    const parsed =
      notificationDeleteSchema.safeParse({
        id,
      });

    if (!parsed.success) {
      return NextResponse.json(
        {
          error:
            "Notification ID required",
        },
        { status: 400 }
      );
    }

    /*
     * Again, ownership is enforced at database
     * level through userId.
     */
    const result =
      await db.notification.deleteMany({
        where: {
          id: parsed.data.id,
          userId: session.user.id,
        },
      });

    if (result.count === 0) {
      return NextResponse.json(
        {
          error:
            "Notification not found",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message:
        "Notification deleted",
    });
  } catch (error) {
    console.error(
      "Delete notification error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Failed to delete notification",
      },
      { status: 500 }
    );
  }
}
