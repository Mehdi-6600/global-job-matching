import { NextIntlClientProvider } from "next-intl";
import { notFound } from "next/navigation";
import { locales, type Locale } from "@/lib/i18n/routing";
import { auth } from "@/lib/auth";
import { SessionProvider } from "@/components/session-provider";
import { Navbar } from "@/components/navbar";
import { Toaster } from "@/components/ui/toaster";

export default async function LocaleLayout({
  children,
  params: { locale },
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  if (!locales.includes(locale as Locale)) {
    notFound();
  }

  const session = await auth();
  const messages = (await import(`../../../messages/${locale}.json`)).default;

  return (
    <html lang={locale} dir={locale === "ar" || locale === "fa" ? "rtl" : "ltr"}>
      <body className="min-h-screen bg-background text-foreground antialiased">
        <NextIntlClientProvider locale={locale} messages={messages}>
          <SessionProvider session={session}>
            <Navbar />
            <main className="container mx-auto px-4 py-6">{children}</main>
            <Toaster />
          </SessionProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
