"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useTranslations } from "next-intl";
import { Link as IntlLink } from "@/lib/i18n/routing";
import { Button } from "@/components/ui/button";

export function Navbar() {
  const t = useTranslations("Nav");
  const { data: session } = useSession();
  const pathname = usePathname();

  return (
    <nav className="border-b bg-background">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <IntlLink href="/" className="text-xl font-bold">
          GlobalJob
        </IntlLink>

        <div className="flex items-center gap-4">
          {session?.user ? (
            <>
              <span className="text-sm text-muted-foreground">
                {session.user.name || session.user.email}
              </span>
              <Button variant="outline" size="sm" onClick={() => signOut()}>
                {t("logout")}
              </Button>
            </>
          ) : (
            <>
              <IntlLink href="/login">
                <Button variant="ghost" size="sm">{t("login")}</Button>
              </IntlLink>
              <IntlLink href="/register">
                <Button size="sm">{t("register")}</Button>
              </IntlLink>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
