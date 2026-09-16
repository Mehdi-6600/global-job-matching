"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { isAdminRole, isEmployerRole } from "@/lib/roles";
import {
  Bell,
  BriefcaseBusiness,
  Building2,
  Loader2,
  Menu,
  ShieldCheck,
  UserRound,
  X,
  ShieldAlert,
  FileText,
} from "lucide-react";
import { useLocale } from "@/components/locale-provider";
import { LanguageSwitcher } from "@/components/language-switcher";
import { BrandMark } from "@/components/brand-logo";

export default function Navbar() {
  const { data: session, status } = useSession();
  const { t } = useLocale();
  const pathname = usePathname();

  const [mobileOpen, setMobileOpen] = useState(false);

  const userRole = session?.user?.role as string | undefined;

  const isAdmin = isAdminRole(userRole);
  // Employer nav: pure employers only (admin uses Admin link)
  const isEmployer = isEmployerRole(userRole) && !isAdmin;

  const isLoggedIn =
    status === "authenticated" && !!session;

  const links = [
    { href: "/jobs", label: t("Nav.jobs", "Jobs") },
    { href: "/companies", label: t("Nav.companies", "Companies") },
    { href: "/locations", label: t("Nav.locations", "Locations") },
    { href: "/categories", label: t("Nav.categories", "Categories") },
    { href: "/blog", label: t("Nav.blog", "Blog") },
    { href: "/pricing", label: t("Nav.pricing", "Pricing") },
  ];

  const accountLinks = [
    {
      href: "/career-risk",
      label: t("CareerRisk.title", "AI Career Risk"),
      icon: ShieldAlert,
    },
    {
      href: "/resume-builder",
      label: t("Resume.title", "Resume Builder"),
      icon: FileText,
    },
  ];

  function closeMobile() {
    setMobileOpen(false);
  }

  function isActive(href: string) {
    return (
      pathname === href ||
      pathname.startsWith(`${href}/`)
    );
  }

  return (
    <header className="gjm-header">
      <nav className="gjm-nav">
        <div className="gjm-nav-inner">
          <Link
            href="/"
            className="gjm-brand"
            onClick={closeMobile}
          >
            <span className="gjm-brand-mark" aria-hidden="true">
              <BrandMark size={36} />
            </span>

            <span className="gjm-brand-copy">
              <strong>GLOBAL JOB</strong>
              <span>MATCHING</span>
            </span>
          </Link>

          <div className="gjm-desktop-nav">
            <div className="gjm-main-links">
              {links.map((link) => {
                const active = isActive(link.href);

                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`gjm-nav-link ${
                      active ? "active" : ""
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}

              {isLoggedIn &&
                accountLinks.map((link) => {
                  const Icon = link.icon;
                  const active = isActive(link.href);

                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={`gjm-nav-link ${
                        active ? "active" : ""
                      }`}
                    >
                      <Icon size={14} />
                      {link.label}
                    </Link>
                  );
                })}
            </div>

            <div className="gjm-nav-actions">
              {isEmployer && (
                <Link
                  href="/employer/dashboard"
                  className="gjm-nav-utility"
                >
                  <Building2 size={16} />
                  {t("Nav.employer", "Employer")}
                </Link>
              )}

              {isAdmin && (
                <Link href="/admin" className="gjm-nav-admin">
                  Admin
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

                  <Link
                    href="/dashboard"
                    className="gjm-nav-profile"
                  >
                    <UserRound size={16} />
                    {t("Nav.dashboard", "Dashboard")}
                  </Link>

                  <button
                    type="button"
                    className="gjm-nav-signout"
                    onClick={() =>
                      signOut({ callbackUrl: "/" })
                    }
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
                    {t("Nav.register", "Get Started")}
                    <BriefcaseBusiness size={15} />
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
              onClick={() =>
                setMobileOpen((value) => !value)
              }
              aria-label={
                mobileOpen ? "Close menu" : "Open menu"
              }
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? (
                <X size={22} />
              ) : (
                <Menu size={22} />
              )}
            </button>
          </div>
        </div>

        {mobileOpen && (
          <div className="gjm-mobile-menu">
            <div className="gjm-mobile-scroll">
              <div className="gjm-mobile-links">
                {links.map((link) => {
                  const active = isActive(link.href);

                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={`gjm-mobile-link ${
                        active ? "active" : ""
                      }`}
                      onClick={closeMobile}
                    >
                      {link.label}
                    </Link>
                  );
                })}

                {isLoggedIn &&
                  accountLinks.map((link) => {
                    const Icon = link.icon;
                    const active = isActive(link.href);

                    return (
                      <Link
                        key={link.href}
                        href={link.href}
                        className={`gjm-mobile-link ${
                          active ? "active" : ""
                        }`}
                        onClick={closeMobile}
                      >
                        <Icon size={17} />
                        {link.label}
                      </Link>
                    );
                  })}
              </div>

              <div className="gjm-mobile-account">
                {isLoggedIn ? (
                  <>
                    {isAdmin && (
                      <Link
                        href="/admin"
                        className="gjm-mobile-account-link gjm-mobile-admin-link"
                        onClick={closeMobile}
                      >
                        <ShieldCheck size={17} />
                        {t("Nav.admin", "Admin Panel")}
                      </Link>
                    )}

                    {isEmployer && (
                      <Link
                        href="/employer/dashboard"
                        className="gjm-mobile-account-link"
                        onClick={closeMobile}
                      >
                        <Building2 size={17} />
                        {t("Nav.employer", "Employer")}
                      </Link>
                    )}

                    <Link
                      href="/dashboard"
                      className="gjm-mobile-account-link"
                      onClick={closeMobile}
                    >
                      <UserRound size={17} />
                      {t("Nav.dashboard", "Dashboard")}
                    </Link>

                    <Link
                      href="/notifications"
                      className="gjm-mobile-account-link"
                      onClick={closeMobile}
                    >
                      <Bell size={17} />
                      {t("Nav.notifications", "Notifications")}
                    </Link>

                    <button
                      type="button"
                      className="gjm-mobile-signout"
                      onClick={() => {
                        closeMobile();
                        signOut({ callbackUrl: "/" });
                      }}
                    >
                      {t("Nav.logout", "Logout")}
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      href="/login"
                      className="gjm-mobile-login"
                      onClick={closeMobile}
                    >
                      {t("Nav.login", "Login")}
                    </Link>

                    <Link
                      href="/register"
                      className="gjm-mobile-cta"
                      onClick={closeMobile}
                    >
                      {t("Nav.register", "Get Started")}
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}
