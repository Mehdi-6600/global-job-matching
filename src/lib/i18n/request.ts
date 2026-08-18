import { getRequestConfig } from "next-intl/server";
import { locales, defaultLocale, type Locale } from "./routing";

export default getRequestConfig(async ({ locale }) => {
  const resolved = locales.includes(locale as Locale)
    ? (locale as Locale)
    : defaultLocale;

  const messages = (await import(`../../../messages/${resolved}.json`)).default;

  return {
    locale: resolved,
    messages,
    timeZone: "UTC",
    now: new Date(),
  };
});
