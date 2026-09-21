"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { isAdminRole, isEmployerRole } from "@/lib/roles";
import {
  Bell,
  BriefcaseBusiness,
  Building2,
  ChevronDown,
  FileText,
  Loader2,
  LogOut,
  Menu,
  ShieldAlert,
  ShieldCheck,
  UserRound,
  X,
} from "lucide-react";
import { useLocale } from "@/components/locale-provider";
import { LanguageSwitcher } from "@/components/language-switcher";
import { BrandMark } from "@/components/brand-logo";

/* ----------------------------------------------------------------
 * Notification badge — lightweight unread count for the signed-in
 * user. One request per session, cached in local component state.
 * We intentionally do NOT poll.
 * ---------------------------------------------------------------- */
function useUnreadNotifications(enabled: boolean): number {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!enabled) {
      setCount(0);
      return;
    }

    let cancelled = false;

    fetch("/api/notifications?limit=1", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled) return;
        if (data && typeof data.unreadCount === "number") {
          setCount(data.unreadCount);
        }
      })
      .catch(() => {
        /* silent — badge is non-critical */
      });

    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return count;
}

/* ----------------------------------------------------------------
 * Profile dropdown — small, keyboard accessible.
 * Closes on Escape, outside click, or route change.
 * ---------------------------------------------------------------- */
interface ProfileMenuProps {
  isAdmin: boolean;
  isEmployer: boolean;
  onNavigate: () => void;
  labels: {
    dashboard: string;
    careerRisk: string;
    resumeBuilder: string;
    settings: string;
    admin: string;
    employer: string;
    logout: string;
  };
}

function ProfileMenu({
  isAdmin,
  isEmployer,
  onNavigate,
  labels,
}: ProfileMenuProps) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const pathname = usePathname();

  // Close on route change
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="gjm-nav-profile"
      >
        <UserRound size={16} />
        <span className="hidden sm:inline">{labels.dashboard}</span>
        <ChevronDown
          size={14}
          className={open ? "rotate-180 transition-transform" : "transition-transform"}
        />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute end-0 mt-2 w-56 rounded-[var(--radius-lg)] bg-[var(--surface)] border border-[var(--border-soft)] shadow-[var(--elev-4)] p-1.5 z-50"
        >
          <Link
            href="/dashboard"
            role="menuitem"
            onClick={() => {
              onNavigate();
              setOpen(false);
            }}
            className="flex items-center gap-2 px-3 py-2 rounded-[var(--radius-md)] text-sm text-[var(--text-body)] hover:bg-[var(--surface-2)]"
          >
            <UserRound size={15} />
            {labels.dashboard}
          </Link>

          <Link
            href="/career-risk"
            role="menuitem"
            onClick={() => {
              onNavigate();
              setOpen(false);
            }}
            className="flex items-center gap-2 px-3 py-2 rounded-[var(--radius-md)] text-sm text-[var(--text-body)] hover:bg-[var(--surface-2)]"
          >
            <ShieldAlert size={15} />
            {labels.careerRisk}
          </Link>

          <Link
            href="/resume-builder"
            role="menuitem"
            onClick={() => {
              onNavigate();
              setOpen(false);
            }}
            className="flex items-center gap-2 px-3 py-2 rounded-[var(--radius-md)] text-sm text-[var(--text-body)] hover:bg-[var(--surface-2)]"
          >
            <FileText size={15} />
            {labels.resumeBuilder}
          </Link>

          <Link
            href="/settings"
            role="menuitem"
            onClick={() => {
              onNavigate();
              setOpen(false);
            }}
            className="flex items-center gap-2 px-3 py-2 rounded-[var(--radius-md)] text-sm text-[var(--text-body)] hover:bg-[var(--surface-2)]"
          >
            {labels.settings}
          </Link>

          {(isAdmin || isEmployer) && (
            <div className="my-1 h-px bg-[var(--border-soft)]" />
          )}

          {isAdmin && (
            <Link
              href="/admin"
              role="menuitem"
              onClick={() => {
                onNavigate();
                setOpen(false);
              }}
              className="flex items-center gap-2 px-3 py-2 rounded-[var(--radius-md)] text-sm text-[var(--error)] hover:bg-[var(--error-soft)]"
            >
              <ShieldCheck size={15} />
              {labels.admin}
            </Link>
          )}

          {isEmployer && (
            <Link
              href="/employer/dashboard"
              role="menuitem"
              onClick={() => {
                onNavigate();
                setOpen(false);
              }}
              className="flex items-center gap-2 px-3 py-2 rounded-[var(--radius-md)] text-sm text-[var(--brand-primary-hover)] hover:bg-[var(--brand-primary-tint)]"
            >
              <Building2 size={15} />
              {labels.employer}
            </Link>
          )}

          <div className="my-1 h-px bg-[var(--border-soft)]" />

          <button
            type="button"
            role="menuitem"
            onClick={() => {
              onNavigate();
              setOpen(false);
              signOut({ callbackUrl: "/" });
            }}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-[var(--radius-md)] text-sm text-[var(--text-muted)] hover:bg-[var(--error-soft)] hover:text-[var(--error)]"
          >
            <LogOut size={15} />
            {labels.logout}
          </button>
        </div>
      )}
    </div>
  );
}

export default function Navbar() {
  const { data: session, status } = useSession();
  const { t } = useLocale();
  const pathname = usePathname();

  const [mobileOpen, setMobileOpen] = useState(false);

  const userRole = session?.user?.role as string | undefined;
  const isAdmin = isAdminRole(userRole);
  const isEmployer = isEmployerRole(userRole) && !isAdmin;

  const sessionError = (session as { error?: string } | null)?.error;
  const isSessionInvalidated = sessionError === "SessionInvalidated";

  const isLoggedIn =
    status === "authenticated" && !!session && !isSessionInvalidated;

  const router = useRouter();
  useEffect(() => {
    if (isSessionInvalidated) {
      // Session was revoked server-side — force clean client state
      void signOut({ redirect: false }).then(() => {
        router.replace("/login");
      });
    }
  }, [isSessionInvalidated, router]);

  const unreadCount = useUnreadNotifications(isLoggedIn);

  /* --------------------------------------------------------------
   * Main navigation links — kept minimal on purpose.
   * Account-scoped links (Career Risk, Resume, Settings) live in
   * the profile dropdown to reduce desktop CTA overload.
   * -------------------------------------------------------------- */
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
    {
      href: "/settings",
      label: t("Nav.settings", "Settings"),
      icon: UserRound,
    },
  ];

  const profileLabels = {
    dashboard: t("Nav.dashboard", "Dashboard"),
    careerRisk: t("CareerRisk.title", "AI Career Risk"),
    resumeBuilder: t("Resume.title", "Resume Builder"),
    settings: t("Nav.settings", "Settings"),
    admin: t("Nav.admin", "Admin Panel"),
    employer: t("Nav.employer", "Employer"),
    logout: t("Nav.logout", "Logout"),
  };

  const menuOpenLabel = t("Nav.openMenu", "Open menu");
  const menuCloseLabel = t("Nav.closeMenu", "Close menu");
  const notificationsLabel = t("Nav.notifications", "Notifications");

  function closeMobile() {
    setMobileOpen(false);
  }

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <header className="gjm-header">
      <nav className="gjm-nav">
        <div className="gjm-nav-inner">
          <Link href="/" className="gjm-brand" onClick={closeMobile}>
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
                    aria-current={active ? "page" : undefined}
                    className={`gjm-nav-link ${active ? "active" : ""}`}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </div>

            <div className="gjm-nav-actions">
              {isLoggedIn ? (
                <>
                  {/* Employer quick-access — visible on desktop when employer */}
                  {isEmployer && (
                    <Link
                      href="/employer/dashboard"
                      className="gjm-nav-utility"
                      aria-current={
                        isActive("/employer/dashboard") ? "page" : undefined
                      }
                    >
                      <Building2 size={16} />
                      <span className="hidden lg:inline">
                        {t("Nav.employer", "Employer")}
                      </span>
                    </Link>
                  )}

                  {/* Notifications with unread badge */}
                  <Link
                    href="/notifications"
                    className="gjm-nav-icon relative"
                    aria-label={
                      unreadCount > 0
                        ? `${notificationsLabel} (${unreadCount})`
                        : notificationsLabel
                    }
                  >
                    <Bell size={18} />
                    {unreadCount > 0 && (
                      <span
                        aria-hidden="true"
                        className="absolute -top-1 -end-1 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-[var(--error)] text-white text-[10px] font-bold leading-none"
                      >
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </span>
                    )}
                  </Link>

                  <ProfileMenu
                    isAdmin={isAdmin}
                    isEmployer={isEmployer}
                    onNavigate={closeMobile}
                    labels={profileLabels}
                  />
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
              onClick={() => setMobileOpen((v) => !v)}
              aria-label={mobileOpen ? menuCloseLabel : menuOpenLabel}
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? <X size={22} /> : <Menu size={22} />}
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
                      onClick={closeMobile}
                      aria-current={active ? "page" : undefined}
                      className={`gjm-mobile-link ${active ? "active" : ""}`}
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
                        onClick={closeMobile}
                        aria-current={active ? "page" : undefined}
                        className={`gjm-mobile-link ${active ? "active" : ""}`}
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
                        onClick={closeMobile}
                        className="gjm-mobile-account-link gjm-mobile-admin-link"
                      >
                        <ShieldCheck size={17} />
                        {t("Nav.admin", "Admin Panel")}
                      </Link>
                    )}

                    {isEmployer && (
                      <Link
                        href="/employer/dashboard"
                        onClick={closeMobile}
                        className="gjm-mobile-account-link"
                      >
                        <Building2 size={17} />
                        {t("Nav.employer", "Employer")}
                      </Link>
                    )}

                    <Link
                      href="/dashboard"
                      onClick={closeMobile}
                      className="gjm-mobile-account-link"
                    >
                      <UserRound size={17} />
                      {t("Nav.dashboard", "Dashboard")}
                    </Link>

                    <Link
                      href="/notifications"
                      onClick={closeMobile}
                      className="gjm-mobile-account-link"
                    >
                      <Bell size={17} />
                      {t("Nav.notifications", "Notifications")}
                      {unreadCount > 0 && (
                        <span
                          aria-hidden="true"
                          className="ms-auto inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-[var(--error)] text-white text-[10px] font-bold leading-none"
                        >
                          {unreadCount > 9 ? "9+" : unreadCount}
                        </span>
                      )}
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
                      onClick={closeMobile}
                      className="gjm-mobile-login"
                    >
                      {t("Nav.login", "Login")}
                    </Link>

                    <Link
                      href="/register"
                      onClick={closeMobile}
                      className="gjm-mobile-cta"
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
