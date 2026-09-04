import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function DELETE() {
  try {
    const session = await auth();

    if (!session?.user?.id || !session.user.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const userEmail = session.user.email;
    const ownerEmail = process.env.OWNER_EMAIL?.trim();

    // Prevent deleting the system owner account
    if (
      ownerEmail &&
      userEmail.toLowerCase() === ownerEmail.toLowerCase()
    ) {
      return NextResponse.json(
        { error: "Owner account cannot be deleted." },
        { status: 403 }
      );
    }

    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    /**
     * Application / JobAlert / Profile / etc. use onDelete: Cascade from User.
     * We still delete explicit children first where helpful, then the user.
     * Relation name on Application is `user` (userId), NOT `applicant`.
     */
    await db.$transaction(async (tx) => {
      await tx.jobAlert.deleteMany({ where: { userId } });
      await tx.application.deleteMany({ where: { userId } });
      await tx.savedJob.deleteMany({ where: { userId } }).catch(() => undefined);
      await tx.notification.deleteMany({ where: { userId } }).catch(() => undefined);
      await tx.transaction.deleteMany({ where: { userId } }).catch(() => undefined);

      await tx.user.delete({ where: { id: userId } });
    });

    return NextResponse.json(
      { message: "Account deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Account deletion error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
