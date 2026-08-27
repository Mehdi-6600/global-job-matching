import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const user =
      await prisma.user.findUnique({
        where: {
          id: session.user.id,
        },
        select: {
          id: true,
          name: true,
          email: true,
          title: true,
          phone: true,
          location: true,
          bio: true,
          image: true,
          role: true,
          createdAt: true,
        },
      });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      user: {
        ...user,
        avatar: user.image,
      },
    });
  } catch (error) {
    console.error(
      "Get user error:",
      error
    );

    return NextResponse.json(
      {
        error: "Failed to get user",
      },
      {
        status: 500,
      }
    );
  }
}

export async function PUT(
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

    const body = await req.json();

    const user =
      await prisma.user.update({
        where: {
          id: session.user.id,
        },
        data: {
          name:
            typeof body.name === "string"
              ? body.name.trim()
              : undefined,

          email:
            typeof body.email === "string"
              ? body.email.trim()
              : undefined,

          title:
            typeof body.title === "string"
              ? body.title.trim()
              : null,

          phone:
            typeof body.phone === "string"
              ? body.phone.trim()
              : null,

          location:
            typeof body.location === "string"
              ? body.location.trim()
              : null,

          bio:
            typeof body.bio === "string"
              ? body.bio.trim()
              : null,

          image:
            typeof body.avatar === "string"
              ? body.avatar.trim()
              : null,
        },
        select: {
          id: true,
          name: true,
          email: true,
          title: true,
          phone: true,
          location: true,
          bio: true,
          image: true,
          role: true,
        },
      });

    return NextResponse.json({
      success: true,
      user: {
        ...user,
        avatar: user.image,
      },
    });
  } catch (error) {
    console.error(
      "Update user error:",
      error
    );

    return NextResponse.json(
      {
        error: "Failed to update user",
      },
      {
        status: 500,
      }
    );
  }
}
