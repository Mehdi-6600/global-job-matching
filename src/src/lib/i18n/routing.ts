import { createSharedPathnamesNavigation } from "next-intl/navigation";

export const locales = ["en", "fa", "ar", "es", "fr", "hi"] as const;
export const defaultLocale = "en";

export const { Link, usePathname, useRouter } = createSharedPathnamesNavigation({
  locales,
  defaultLocale,
});
