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

  // 1–7: آیتم‌های عمومی (همیشه قابل مشاهده)
  const publicLinks: NavItem[] = [
    { href: "/", label: t("Nav.home", "Home"), show: true },
    { href: "/jobs", label: t("Nav.jobs", "Jobs"), show: true },
    { href: "/locations", label: t("Nav.locations", "Locations"), show: true },
    { href: "/categories", label: t("Nav.categories", "Categories"), show: true },
    { href: "/companies", label: t("Nav.companies", "Companies"), show: true },
    { href: "/blog", label: t("Nav.blog", "Blog"), show: true },
    { href: "/pricing", label: t("Nav.pricing", "Pricing"), show: true },
  ];

  // 8–12: آیتم‌های وابسته به نقش/ورود (ترتیب دقیق طبق درخواست)
  const roleLinks: NavItem[] = [
    {
      href: "/admin",
      label: t("Nav.admin", "Admin"),
      icon: <Shield size={16} />,
      show: isAdmin,
      accent: "admin",
    },
    {
      href: "/employer/dashboard",
      label: t("Nav.employer", "Employer"),
      icon: <Building2 size={16} />,
      show: isEmployer,
    },
    {
      href: "/career-risk",
      label: t("Nav.careerRisk", "AI Career Risk"),
      icon: <Sparkles size={16} />,
      show: isLoggedIn,
      accent: "cta",
    },
    {
      href: "/resume-builder",
      label: t("Nav.resume", "Resume Builder"),
      icon: <FileText size={16} />,
      show: isLoggedIn,
    },
    {
      href: "/dashboard",
      label: t("Nav.dashboard", "Dashboard"),
      icon: <LayoutDashboard size={16} />,
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
          {/* برند */}
          <Link href="/" className="gjm-brand" onClick={closeMobile}>
            <BrandMark />
            <span className="gjm-brand-copy">
              <strong>GLOBAL JOB</strong>
              <span>MATCHING</span>
            </span>
          </Link>

          {/* ناوبری دسکتاپ */}
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
              {/* Employer — فقط کارفرما */}
              {isEmployer && (
                <Link
                  href="/employer/dashboard"
                  className={`ui-chip ${isActive("/employer/dashboard") ? "ui-chip-selected" : ""}`}
                >
                  <Building2 size={14} />
                  {t("Nav.employer", "Employer")}
                </Link>
              )}

              {/* Admin — فقط ادمین/مالک */}
              {isAdmin && (
                <Link href="/admin" className="gjm-nav-admin">
                  <Shield size={14} />
                  {t("Nav.admin", "Admin")}
                </Link>
              )}

              {/* AI Career Risk — کاربر واردشده */}
              {isLoggedIn && (
                <Link
                  href="/career-risk"
                  className={`ui-chip ${isActive("/career-risk") ? "ui-chip-selected" : ""}`}
                >
                  <Sparkles size={14} />
                  {t("Nav.careerRisk", "AI Career Risk")}
                </Link>
              )}

              {/* Resume Builder — کاربر واردشده */}
              {isLoggedIn && (
                <Link
                  href="/resume-builder"
                  className={`ui-chip ${isActive("/resume-builder") ? "ui-chip-selected" : ""}`}
                >
                  <FileText size={14} />
                  {t("Nav.resume", "Resume Builder")}
                </Link>
              )}

              {isLoggedIn ? (
                <>
                  {/* اعلان‌ها */}
                  <Link
                    href="/notifications"
                    className="gjm-nav-icon"
                    aria-label={t("Nav.notifications", "Notifications")}
                  >
                    <Bell size={18} />
                  </Link>

                  {/* Dashboard — کاربر واردشده */}
                  <Link href="/dashboard" className="gjm-nav-profile">
                    <UserRound size={16} />
                    {t("Nav.dashboard", "Dashboard")}
                  </Link>

                  {/* Logout — کاربر واردشده */}
                  <button
                    type="button"
                    className="gjm-nav-signout"
                    onClick={() => signOut({ callbackUrl: "/" })}
                  >
                    <LogOut size={16} />
                    {t("Nav.logout", "Logout")}
                  </button>
                </>
              ) : status === "loading" ? (
                <Loader2 size={18} className="gjm-nav-loader" />
              ) : (
                <>
                  {/* Login — کاربر واردنشده */}
                  <Link href="/login" className="gjm-nav-login">
                    {t("Nav.login", "Login")}
                  </Link>
                  {/* Sign up — کاربر واردنشده */}
                  <Link href="/register" className="gjm-nav-cta">
                    {t("Nav.register", "Sign up")}
                    <UserPlus size={15} />
                  </Link>
                </>
              )}

              <LanguageSwitcher />
            </div>
          </div>

          {/* دکمه همبرگری موبایل */}
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

        {/* منوی موبایل — همه‌ی ۱۵ آیتم به ترتیب دقیق */}
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
