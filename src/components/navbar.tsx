"use client";

import Link from "next/link";
import { useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { ROLES } from "@/lib/roles";
import {
  Menu,
  X,
  Loader2,
  Bell,
  FileText,
  ShieldAlert,
} from "lucide-react";
import { useLocale } from "@/components/locale-provider";
import { LanguageSwitcher } from "@/components/language-switcher";

export default function Navbar() {
  const { data: session, status } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);
  const userRole = session?.user?.role as string | undefined;
  const { t } = useLocale();

  const isAdmin = userRole === ROLES.ADMIN || userRole === ROLES.OWNER;
  const isEmployer = userRole === ROLES.EMPLOYER;
  const isLoggedIn = status === "authenticated" && !!session;

  const links = [
    { href: "/", label: t("Nav.home", "Home") },
    { href: "/jobs", label: t("Nav.jobs", "Jobs") },
    { href: "/companies", label: t("Nav.companies", "Companies") },
    { href: "/pricing", label: t("Nav.pricing", "Pricing") },
    { href: "/about", label: t("Nav.about", "About") },
    { href: "/contact", label: t("Nav.contact", "Contact") },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-3">
          <Link href="/" className="text-xl font-bold text-white shrink-0">
            G<span className="text-sky-400">JM</span>
          </Link>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-4 lg:gap-5 flex-1 justify-end">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-slate-300 hover:text-sky-400 transition-colors text-sm font-medium whitespace-nowrap"
              >
                {link.label}
              </Link>
            ))}

            {isAdmin && (
              <Link
                href="/dashboard/admin"
                className="text-red-400 hover:text-red-300 text-sm font-medium"
              >
                {t("Nav.admin", "Admin")}
              </Link>
            )}

            {isEmployer && (
              <Link
                href="/employer/dashboard"
                className="text-emerald-400 hover:text-emerald-300 text-sm font-medium"
              >
                {t("Nav.employer", "Employer")}
              </Link>
            )}

            {/* Language — always visible on desktop */}
            <LanguageSwitcher />

            {status === "loading" ? (
              <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />
            ) : isLoggedIn ? (
              <div className="flex items-center gap-2">
                <Link
                  href="/career-risk"
                  className="text-slate-300 hover:text-sky-400 p-1"
                  title={t("Nav.careerRisk", "AI Career Risk")}
                >
                  <ShieldAlert className="w-4 h-4" />
                </Link>
                <Link
                  href="/resume-builder"
                  className="text-slate-300 hover:text-sky-400 p-1"
                  title={t("Nav.resume", "Resume Builder")}
                >
                  <FileText className="w-4 h-4" />
                </Link>
                <Link
                  href="/notifications"
                  className="text-slate-300 hover:text-sky-400 p-1"
                  title={t("Nav.notifications", "Notifications")}
                >
                  <Bell className="w-4 h-4" />
                </Link>
                <Link
                  href="/dashboard"
                  className="text-slate-300 hover:text-sky-400 text-sm font-medium"
                >
                  {t("Nav.dashboard", "Dashboard")}
                </Link>
                <button
                  type="button"
                  onClick={() => signOut({ callbackUrl: "/" })}
                  className="text-slate-400 hover:text-white text-sm"
                >
                  {t("Nav.logout", "Logout")}
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/register"
                  className="text-slate-300 hover:text-white text-sm font-medium px-2 py-2"
                >
                  {t("Nav.register", "Sign up")}
                </Link>
                <Link
                  href="/login"
                  className="bg-sky-500 hover:bg-sky-400 text-white text-sm font-semibold px-4 py-2 rounded-lg"
                >
                  {t("Nav.login", "Login")}
                </Link>
              </div>
            )}
          </div>

          {/* Mobile: language + hamburger */}
          <div className="flex md:hidden items-center gap-2">
            <LanguageSwitcher compact />
            <button
              type="button"
              onClick={() => setMobileOpen(!mobileOpen)}
              className="text-slate-300 p-2"
              aria-label="Toggle menu"
            >
              {mobileOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        {mobileOpen && (
          <div className="md:hidden pb-4 space-y-1 border-t border-white/10 pt-3">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="block text-slate-300 hover:text-sky-400 py-2 text-sm"
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            {isEmployer && (
              <Link
                href="/employer/dashboard"
                className="block text-emerald-400 py-2 text-sm"
                onClick={() => setMobileOpen(false)}
              >
                {t("Nav.employer", "Employer")}
              </Link>
            )}
            {isLoggedIn ? (
              <>
                <Link
                  href="/career-risk"
                  className="block text-slate-300 py-2 text-sm"
                  onClick={() => setMobileOpen(false)}
                >
                  {t("Nav.careerRisk", "AI Career Risk")}
                </Link>
                <Link
                  href="/resume-builder"
                  className="block text-slate-300 py-2 text-sm"
                  onClick={() => setMobileOpen(false)}
                >
                  {t("Nav.resume", "Resume Builder")}
                </Link>
                <Link
                  href="/dashboard"
                  className="block text-slate-300 py-2 text-sm"
                  onClick={() => setMobileOpen(false)}
                >
                  {t("Nav.dashboard", "Dashboard")}
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    signOut({ callbackUrl: "/" });
                    setMobileOpen(false);
                  }}
                  className="block text-slate-400 py-2 text-sm w-full text-left"
                >
                  {t("Nav.logout", "Logout")}
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/register"
                  className="block text-slate-300 py-2 text-sm"
                  onClick={() => setMobileOpen(false)}
                >
                  {t("Nav.register", "Sign up")}
                </Link>
                <Link
                  href="/login"
                  className="block bg-sky-500 text-white text-center text-sm font-semibold px-4 py-2 rounded-lg mt-2"
                  onClick={() => setMobileOpen(false)}
                >
                  {t("Nav.login", "Login")}
                </Link>
              </>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
