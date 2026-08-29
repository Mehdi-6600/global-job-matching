"use client";

import Link from "next/link";
import { useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { ROLES } from "@/lib/roles";
import { Menu, X, Loader2, Bell, FileText } from "lucide-react";

export default function Navbar() {
  const { data: session, status } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);
  const userRole = session?.user?.role as string | undefined;

  const isAdmin = userRole === ROLES.ADMIN || userRole === ROLES.OWNER;
  const isEmployer = userRole === ROLES.EMPLOYER;
  const isLoggedIn = status === "authenticated" && !!session;

  const links = [
    { href: "/", label: "Home" },
    { href: "/jobs", label: "Jobs" },
    { href: "/companies", label: "Companies" },
    { href: "/pricing", label: "Pricing" },
    { href: "/about", label: "About" },
    { href: "/contact", label: "Contact" },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="text-xl font-bold text-white">
            G<span className="text-sky-400">JM</span>
          </Link>

          <div className="hidden md:flex items-center gap-6">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-slate-300 hover:text-sky-400 transition-colors text-sm font-medium"
              >
                {link.label}
              </Link>
            ))}

            {isAdmin && (
              <Link
                href="/dashboard/admin"
                className="text-red-400 hover:text-red-300 text-sm font-medium"
              >
                Admin
              </Link>
            )}

            {isEmployer && (
              <Link
                href="/employer/dashboard"
                className="text-emerald-400 hover:text-emerald-300 text-sm font-medium"
              >
                Employer
              </Link>
            )}

            {status === "loading" ? (
              <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />
            ) : isLoggedIn ? (
              <div className="flex items-center gap-3">
                <Link
                  href="/resume-builder"
                  className="text-slate-300 hover:text-sky-400 p-1"
                  title="Resume Builder"
                >
                  <FileText className="w-4 h-4" />
                </Link>
                <Link
                  href="/notifications"
                  className="text-slate-300 hover:text-sky-400 p-1"
                  title="Notifications"
                >
                  <Bell className="w-4 h-4" />
                </Link>
                <Link
                  href="/dashboard"
                  className="text-slate-300 hover:text-sky-400 text-sm font-medium"
                >
                  Dashboard
                </Link>
                <button
                  type="button"
                  onClick={() => signOut({ callbackUrl: "/" })}
                  className="text-slate-400 hover:text-white text-sm"
                >
                  Logout
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/register"
                  className="text-slate-300 hover:text-white text-sm font-medium px-3 py-2"
                >
                  Sign up
                </Link>
                <Link
                  href="/login"
                  className="bg-sky-500 hover:bg-sky-400 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-all"
                >
                  Login
                </Link>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden text-slate-300 p-2"
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
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
                Employer
              </Link>
            )}
            {isLoggedIn ? (
              <>
                <Link
                  href="/resume-builder"
                  className="block text-slate-300 py-2 text-sm"
                  onClick={() => setMobileOpen(false)}
                >
                  Resume Builder
                </Link>
                <Link
                  href="/dashboard"
                  className="block text-slate-300 py-2 text-sm"
                  onClick={() => setMobileOpen(false)}
                >
                  Dashboard
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    signOut({ callbackUrl: "/" });
                    setMobileOpen(false);
                  }}
                  className="block text-slate-400 py-2 text-sm w-full text-left"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/register"
                  className="block text-slate-300 py-2 text-sm"
                  onClick={() => setMobileOpen(false)}
                >
                  Sign up
                </Link>
                <Link
                  href="/login"
                  className="block bg-sky-500 text-white text-center text-sm font-semibold px-4 py-2 rounded-lg mt-2"
                  onClick={() => setMobileOpen(false)}
                >
                  Login
                </Link>
              </>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
