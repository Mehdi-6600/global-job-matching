"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { ROLES } from "@/lib/roles";
import {
  Bell,
  Building2,
  FileText,
  LayoutDashboard,
  Loader2,
  LogIn,
  LogOut,
  Menu,
  Shield,
  Sparkles,
  UserPlus,
  UserRound,
  X,
} from "lucide-react";
import { useLocale } from "@/components/locale-provider";
import { LanguageSwitcher } from "@/components/language-switcher";

function BrandMark() {
  return (
    <span className="gjm-brand-mark" aria-hidden="true">
      <span className="gjm-brand-ring" />
      <span className="gjm-brand-node node-a" />
      <span className="gjm-brand-node node-b" />
      <span className="gjm-brand-node node-c" />
    </span>
  );
}

type NavItem = {
  href: string;
  label: string;
  icon?: React.ReactNode;
  show: boolean;
  accent?: "admin" | "cta" | "danger";
};

export default function Navbar() {
  const { data: session, status } = useSession();
  const { t } = useLocale();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const userRole = session?.user?.role as string | undefined;
  const isAdmin = userRole === ROLES.ADMIN || userRole === ROLES.OWNER;
  const isEmployer = userRole === ROLES.EMPLOYER;
  const isLoggedIn = status === "authenticated" && !!session;

  const publicLinks: NavItem[] = [
    { href: "/", label: t("Nav.home", "Home"), show: true },
    { href: "/jobs", label: t("Nav.jobs", "Jobs"), show: true },
    { href: "/locations", label: t("Nav.locations", "Locations"), show: true },
    { href: "/categories", label: t("Nav.categories", "Categories"), show: true },
    { href: "/companies", label: t("Nav.companies", "Companies"), show: true },
    { href: "/blog", label: t("Nav.blog", "Blog"), show: true },
    { href: "/pricing", label: t("Nav.pricing", "Pricing"), show: true },
  ];

  const roleLinks: NavItem[] = [
    {
      href: "/admin",
      label: t("Nav.admin", "Admin"),
      icon: <Shield size={17} />,
      show: isAdmin,
      accent: "admin",
    },
    {
      href: "/employer/dashboard",
      label: t("Nav.employer", "Employer"),
      icon: <Building2 size={17} />,
      show: isEmployer,
    },
    {
      href: "/career-risk",
      label: t("Nav.careerRisk", "AI Career Risk"),
      icon: <Sparkles size={17} />,
      show: isLoggedIn,
    },
    {
      href: "/resume-builder",
      label: t("Nav.resume", "Resume Builder"),
      icon: <FileText size={17} />,
      show: isLoggedIn,
    },
    {
      href: "/dashboard",
      label: t("Nav.dashboard", "Dashboard"),
      icon: <LayoutDashboard size={17} />,
      show: isLoggedIn,
    },
  ];

  function closeMobile() {
    setMobileOpen(false);
  }

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <header className="gjm-header">
      <nav className="gjm-nav">
        <div className="gjm-nav-inner">
          <Link href="/" className="gjm-brand" onClick={closeMobile}>
            <BrandMark />
            <span className="gjm-brand-copy">
              <strong>GLOBAL JOB</strong>
              <span>MATCHING</span>
            </span>
          </Link>

          <div className="gjm-desktop-nav">
            <div className="gjm-main-links">
              {publicLinks
                .filter((l) => l.show && l.href !== "/")
                .map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`gjm-nav-link ${isActive(link.href) ? "active" : ""}`}
                  >
                    {link.label}
                  </Link>
                ))}
            </div>

            <div className="gjm-nav-actions">
              {isEmployer && (
                <Link href="/employer/dashboard" className="gjm-nav-utility">
                  <Building2 size={16} />
                  {t("Nav.employer", "Employer")}
                </Link>
              )}

              {isAdmin && (
                <Link href="/admin" className="gjm-nav-admin">
                  {t("Nav.admin", "Admin")}
                </Link>
              )}

              {isLoggedIn ? (
                <>
                  <Link
                    href="/notifications"
                    className="gjm-nav-icon"
                    aria-label={t("Nav.notifications", "Notifications")}
                  >
                    <Bell size={18} />
                  </Link>
                  <Link href="/dashboard" className="gjm-nav-profile">
                    <UserRound size={16} />
                    {t("Nav.dashboard", "Dashboard")}
                  </Link>
                  <button
                    type="button"
                    className="gjm-nav-signout"
                    onClick={() => signOut({ callbackUrl: "/" })}
                  >
                    {t("Nav.logout", "Logout")}
                  </button>
                </>
              ) : status === "loading" ? (
                <Loader2 size={18} className="gjm-nav-loader" />
              ) : (
                <>
                  <Link href="/login" className="gjm-nav-login">
                    {t("Nav.login", "Login")}
                  </Link>
                  <Link href="/register" className="gjm-nav-cta">
                    {t("Nav.register", "Sign up")}
                    <UserPlus size={15} />
                  </Link>
                </>
              )}

              <LanguageSwitcher />
            </div>
          </div>

          <div className="gjm-mobile-actions">
            <LanguageSwitcher />
            <button
              type="button"
              className="gjm-mobile-menu-button"
              onClick={() => setMobileOpen((v) => !v)}
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {mobileOpen && (
          <div className="gjm-mobile-menu">
            <div className="gjm-mobile-links">
              {publicLinks
                .filter((l) => l.show)
                .map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`gjm-mobile-link ${isActive(link.href) ? "active" : ""}`}
                    onClick={closeMobile}
                  >
                    {link.label}
                  </Link>
                ))}
            </div>

            <div className="gjm-mobile-divider" />

            <div className="gjm-mobile-account">
              {roleLinks
                .filter((l) => l.show)
                .map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`gjm-mobile-account-link ${
                      link.accent === "admin" ? "is-admin" : ""
                    }`}
                    onClick={closeMobile}
                  >
                    {link.icon}
                    {link.label}
                  </Link>
                ))}

              {isLoggedIn ? (
                <button
                  type="button"
                  className="gjm-mobile-signout"
                  onClick={() => {
                    closeMobile();
                    signOut({ callbackUrl: "/" });
                  }}
                >
                  <LogOut size={17} />
                  {t("Nav.logout", "Logout")}
                </button>
              ) : status !== "loading" ? (
                <>
                  <Link
                    href="/login"
                    className="gjm-mobile-login"
                    onClick={closeMobile}
                  >
                    <LogIn size={17} />
                    {t("Nav.login", "Login")}
                  </Link>
                  <Link
                    href="/register"
                    className="gjm-mobile-cta"
                    onClick={closeMobile}
                  >
                    <UserPlus size={17} />
                    {t("Nav.register", "Sign up")}
                  </Link>
                </>
              ) : null}
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}
