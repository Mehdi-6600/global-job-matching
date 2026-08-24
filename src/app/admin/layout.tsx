import { auth } from "@/lib/auth";
import { ROLES } from "@/lib/roles";
import { redirect } from "next/navigation";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login?callbackUrl=/admin");
  }

  const role = (session.user.role as string) || "jobseeker";

  if (role !== ROLES.ADMIN && role !== ROLES.OWNER) {
    redirect("/dashboard");
  }

  return <>{children}</>;
}
