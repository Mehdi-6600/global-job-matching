"use client";

import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/lib/i18n/routing";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  const t = useTranslations("Home");
  const locale = useLocale();

  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
        {t("title")}
      </h1>
      <p className="mt-6 text-lg text-muted-foreground max-w-2xl">
        {t("subtitle")}
      </p>
      <div className="mt-10 flex gap-4">
        <Link href="/jobs">
          <Button size="lg">{t("ctaJobs")}</Button>
        </Link>
        <Link href="/register">
          <Button variant="outline" size="lg">{t("ctaRegister")}</Button>
        </Link>
      </div>
    </div>
  );
}
