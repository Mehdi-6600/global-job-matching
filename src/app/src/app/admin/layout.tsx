import { auth } from "@/lib/auth";
import { isAdmin } from "@/lib/roles";
import { redirect } from "next/navigation";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!isAdmin(session?.user?.role)) {
    redirect("/");
  }
  return <>{children}</>;
}
