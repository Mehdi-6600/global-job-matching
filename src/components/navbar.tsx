"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { isAdminRole, isEmployerRole } from "@/lib/roles";
import {
  Bell,
  BriefcaseBusiness,
  Building2,
  ChevronDown,
  FileText,
  LogOut,
  Menu,
  Plus,
  Search,
  ShieldAlert,
  ShieldCheck,
  UserRound,
  X,
} from "lucide-react";
import { useLocale } from "@/components/locale-provider";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { BrandMark } from "@/components/brand-logo";

/* ------------------------------------------------------------------ *
 * Unread notification count — one request per session, never polled.
 * ------------------------------------------------------------------ */
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

/* ------------------------------------------------------------------ *
 * Profile dropdown — keyboard accessible, closes on Escape / outside
 * click / route change.
 * ------------------------------------------------------------------ */
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
  initials: string;
}

const menuItemClass =
  "flex w-full items-center gap-2.5 rounded-[var(--radius-sm)] px-3 py-2 text-start text-sm text-[var(--text-body)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)] focus-visible:bg-[var(--surface-2)] focus-visible:outline-none";

function ProfileMenu({
  isAdmin,
  isEmployer,
  onNavigate,
  labels,
  initials,
}: ProfileMenuProps) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target as Node)) setOpen(false);
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
        aria-label={labels.dashboard}
        className="inline-flex h-9 items-center gap-2 rounded-full border border-[var(--border-soft)] bg-[var(--surface)] ps-1 pe-2.5 text-sm font-medium text-[var(--text-body)] transition-colors hover:border-[var(--border)] hover:bg-[var(--surface-2)]"
      >
        <span
          aria-hidden="true"
          className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[var(--brand-primary-soft)] text-[11px] font-bold text-[var(--brand-primary-hover)]"
        >
          {initials}
        </span>
        <span className="hidden max-w-[7.5rem] truncate lg:inline">
          {labels.dashboard}
        </span>
        <ChevronDown
          size={14}
          aria-hidden="true"
          className={open ? "rotate-180 transition-transform" : "transition-transform"}
        />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute end-0 z-50 mt-2 w-60 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-1.5 shadow-[var(--shadow-3)]"
        >
          <Link
            href="/dashboard"
            role="menuitem"
            onClick={() => {
              onNavigate();
              setOpen(false);
            }}
            className={menuItemClass}
          >
            <UserRound size={15} aria-hidden="true" />
            {labels.dashboard}
          </Link>

          <Link
            href="/career-risk"
            role="menuitem"
            onClick={() => {
              onNavigate();
              setOpen(false);
            }}
            className={menuItemClass}
          >
            <ShieldAlert size={15} aria-hidden="true" />
            {labels.careerRisk}
          </Link>

          <Link
            href="/resume-builder"
            role="menuitem"
            onClick={() => {
              onNavigate();
              setOpen(false);
            }}
            className={menuItemClass}
          >
            <FileText size={15} aria-hidden="true" />
            {labels.resumeBuilder}
          </Link>

          <Link
            href="/settings"
            role="menuitem"
            onClick={() => {
              onNavigate();
              setOpen(false);
            }}
            className={menuItemClass}
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
              className={`${menuItemClass} text-[var(--error)] hover:bg-[var(--error-soft)] hover:text-[var(--error)]`}
            >
              <ShieldCheck size={15} aria-hidden="true" />
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
              className={`${menuItemClass} text-[var(--brand-primary-hover)]`}
            >
              <Building2 size={15} aria-hidden="true" />
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
            className={`${menuItemClass} hover:bg-[var(--error-soft)] hover:text-[var(--error)]`}
          >
            <LogOut size={15} aria-hidden="true" />
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

  /* Session invalidation detection (defense-in-depth). */
  const sessionError = (session as { error?: string } | null)?.error;
  const isSessionInvalidated = sessionError === "SessionInvalidated";

  const isLoggedIn =
    status === "authenticated" && !!session && !isSessionInvalidated;

  const unreadCount = useUnreadNotifications(isLoggedIn);

  const userName =
    session?.user?.name || session?.user?.email?.split("@")[0] || "";
  const initials = userName
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileOpen) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setMobileOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [mobileOpen]);

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
      <a
        href="#main-content"
        className="gjm-sr-only focus:not-sr-only focus:absolute focus:start-4 focus:top-3 focus:z-[70] focus:rounded-[var(--radius-md)] focus:bg-[var(--surface)] focus:px-3 focus:py-2 focus:text-sm focus:font-semibold focus:text-[var(--text-primary)] focus:shadow-[var(--shadow-2)]"
      >
        {t("Common.skipToContent", "Skip to content")}
      </a>

      <nav aria-label={t("Common.mainNavigation", "Main navigation")} className="gjm-container">
        <div className="flex h-16 items-center justify-between gap-3">
          {/* Brand */}
          <Link
            href="/"
            onClick={closeMobile}
            className="inline-flex shrink-0 items-center gap-2.5 rounded-[var(--radius-md)] transition-opacity hover:opacity-85"
          >
            <span
              aria-hidden="true"
              className="inline-flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] border border-[var(--border-soft)] bg-[var(--surface)] p-0.5"
            >
              <BrandMark size={30} />
            </span>
            <span className="flex flex-col leading-none">
              <strong className="text-[0.8125rem] font-bold tracking-[0.06em] text-[var(--text-primary)]">
                GLOBAL JOB
              </strong>
              <span className="text-[0.625rem] font-semibold tracking-[0.22em] text-[var(--text-subtle)]">
                MATCHING
              </span>
            </span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden items-center gap-1 lg:flex">
            {links.map((link) => {
              const active = isActive(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={active ? "page" : undefined}
                  className={[
                    "rounded-[var(--radius-sm)] px-3 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-[var(--brand-primary-tint)] text-[var(--brand-primary-hover)]"
                      : "text-[var(--text-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)]",
                  ].join(" ")}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>

          {/* Actions */}
          <div className="hidden items-center gap-1.5 lg:flex">
            <Link
              href="/jobs"
              aria-label={t("Nav.searchJobs", "Search jobs")}
              className="gjm-icon-btn"
            >
              <Search size={17} aria-hidden="true" />
            </Link>

            <ThemeToggle />
            <LanguageSwitcher />

            {isLoggedIn ? (
              <>
                {isEmployer && (
                  <Link
                    href="/employer/post-job"
                    className="ms-1 inline-flex h-9 items-center gap-1.5 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-3 text-[0.8125rem] font-semibold text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-2)]"
                  >
                    <Plus size={15} aria-hidden="true" />
                    <span className="hidden xl:inline">
                      {t("Nav.postJob", "Post a job")}
                    </span>
                  </Link>
                )}

                <Link
                  href="/notifications"
                  className="gjm-icon-btn relative ms-1"
                  aria-label={
                    unreadCount > 0
                      ? `${notificationsLabel} (${unreadCount})`
                      : notificationsLabel
                  }
                >
                  <Bell size={18} aria-hidden="true" />
                  {unreadCount > 0 && (
                    <span
                      aria-hidden="true"
                      className="absolute -top-0.5 -end-0.5 inline-flex h-[17px] min-w-[17px] items-center justify-center rounded-full bg-[var(--error)] px-1 text-[10px] font-bold leading-none text-[var(--text-on-brand)]"
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
                  initials={initials || "U"}
                />
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="ms-1 rounded-[var(--radius-md)] px-3 py-2 text-sm font-medium text-[var(--text-body)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)]"
                >
                  {t("Nav.login", "Login")}
                </Link>

                <Link
                  href="/register"
                  className="inline-flex h-9 items-center gap-1.5 rounded-[var(--radius-md)] bg-[var(--brand-action)] px-3.5 text-[0.8125rem] font-semibold text-[var(--text-muted)] transition-colors hover:bg-[var(--brand-action-hover)]"
                >
                  <BriefcaseBusiness size={15} aria-hidden="true" />
                  {t("Nav.register", "Get Started")}
                </Link>
              </>
            )}
          </div>

          {/* Mobile actions */}
          <div className="flex items-center gap-1 lg:hidden">
            <ThemeToggle />
            <LanguageSwitcher compact />

            <button
              type="button"
              className="gjm-icon-btn"
              onClick={() => setMobileOpen((v) => !v)}
              aria-label={mobileOpen ? menuCloseLabel : menuOpenLabel}
              aria-expanded={mobileOpen}
              aria-controls="gjm-mobile-menu"
            >
              {mobileOpen ? (
                <X size={20} aria-hidden="true" />
              ) : (
                <Menu size={20} aria-hidden="true" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile sheet */}
        {mobileOpen && (
          <div
            id="gjm-mobile-menu"
            className="max-h-[calc(100dvh-4rem)] overflow-y-auto border-t border-[var(--border-soft)] pb-5 pt-3 lg:hidden"
          >
            <div className="grid gap-1">
              {links.map((link) => {
                const active = isActive(link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={closeMobile}
                    aria-current={active ? "page" : undefined}
                    className={[
                      "rounded-[var(--radius-md)] px-3 py-2.5 text-[0.9375rem] font-medium transition-colors",
                      active
                        ? "bg-[var(--brand-primary-tint)] text-[var(--brand-primary-hover)]"
                        : "text-[var(--text-body)] hover:bg-[var(--surface-2)]",
                    ].join(" ")}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </div>

            {isLoggedIn && (
              <>
                <p className="mt-4 mb-1.5 px-3 text-[0.6875rem] font-bold uppercase tracking-[0.13em] text-[var(--text-subtle)]">
                  {t("Nav.account", "Account")}
                </p>
                <div className="grid gap-1">
                  {accountLinks.map((link) => {
                    const Icon = link.icon;
                    return (
                      <Link
                        key={link.href}
                        href={link.href}
                        onClick={closeMobile}
                        className="flex items-center gap-2.5 rounded-[var(--radius-md)] px-3 py-2.5 text-[0.9375rem] font-medium text-[var(--text-body)] transition-colors hover:bg-[var(--surface-2)]"
                      >
                        <Icon size={17} aria-hidden="true" />
                        {link.label}
                      </Link>
                    );
                  })}
                  <Link
                    href="/dashboard"
                    onClick={closeMobile}
                    className="flex items-center gap-2.5 rounded-[var(--radius-md)] px-3 py-2.5 text-[0.9375rem] font-medium text-[var(--text-body)] transition-colors hover:bg-[var(--surface-2)]"
                  >
                    <UserRound size={17} aria-hidden="true" />
                    {t("Nav.dashboard", "Dashboard")}
                  </Link>
                  {isAdmin && (
                    <Link
                      href="/admin"
                      onClick={closeMobile}
                      className="flex items-center gap-2.5 rounded-[var(--radius-md)] px-3 py-2.5 text-[0.9375rem] font-medium text-[var(--error)] transition-colors hover:bg-[var(--error-soft)]"
                    >
                      <ShieldCheck size={17} aria-hidden="true" />
                      {t("Nav.admin", "Admin Panel")}
                    </Link>
                  )}
                  {isEmployer && (
                    <Link
                      href="/employer/dashboard"
                      onClick={closeMobile}
                      className="flex items-center gap-2.5 rounded-[var(--radius-md)] px-3 py-2.5 text-[0.9375rem] font-medium text-[var(--brand-primary-hover)] transition-colors hover:bg-[var(--brand-primary-tint)]"
                    >
                      <Building2 size={17} aria-hidden="true" />
                      {t("Nav.employer", "Employer")}
                    </Link>
                  )}
                </div>
              </>
            )}

            <div className="mt-4 grid gap-2 border-t border-[var(--border-soft)] pt-4">
              {isLoggedIn ? (
                <button
                  type="button"
                  onClick={() => {
                    closeMobile();
                    signOut({ callbackUrl: "/" });
                  }}
                  className="gjm-btn gjm-btn-secondary w-full"
                >
                  {t("Nav.logout", "Logout")}
                </button>
              ) : (
                <>
                  <Link
                    href="/login"
                    onClick={closeMobile}
                    className="gjm-btn gjm-btn-secondary w-full"
                  >
                    {t("Nav.login", "Login")}
                  </Link>
                  <Link
                    href="/register"
                    onClick={closeMobile}
                    className="gjm-btn gjm-btn-primary w-full"
                  >
                    {t("Nav.register", "Get Started")}
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}
