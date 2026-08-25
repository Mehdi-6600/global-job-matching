"use client";

import Link from "next/link";
import { useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { ROLES } from "@/lib/roles";

export default function Navbar() {
  const { data: session } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);
  const userRole = session?.user?.role as string | undefined;

  const isAdmin = userRole === ROLES.ADMIN || userRole === ROLES.OWNER;
  const isEmployer = userRole === ROLES.EMPLOYER;

  const links = [
    { href: "/", label: "Home" },
    { href: "/jobs", label: "Jobs" },
    { href: "/companies", label: "Companies" },
    { href: "/pricing", label: "Pricing" },
    { href: "/contact", label: "Contact" },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="text-xl font-bold text-gradient">
            GJM
          </Link>

          <div className="hidden md:flex items-center gap-8">
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
              <Link href="/dashboard/admin" className="text-red-400 hover:text-red-300 text-sm font-medium">
                Admin
              </Link>
            )}

            {isEmployer && (
              <Link href="/dashboard/employer" className="text-emerald-400 hover:text-emerald-300 text-sm font-medium">
                Employer
              </Link>
            )}

            {session ? (
              <div className="flex items-center gap-4">
                <Link href="/dashboard" className="text-slate-300 hover:text-sky-400 text-sm">
                  Dashboard
                </Link>
                <button
                  onClick={() => signOut()}
                  className="text-slate-400 hover:text-white text-sm"
                >
                  Logout
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                className="bg-sky-500 hover:bg-sky-400 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-all"
              >
                Login
              </Link>
            )}
          </div>

          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden text-slate-300 p-2"
          >
            {mobileOpen ? "✕" : "☰"}
          </button>
        </div>

        {mobileOpen && (
          <div className="md:hidden pb-4 space-y-2">
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
            {session ? (
              <>
                <Link href="/dashboard" className="block text-slate-300 py-2 text-sm" onClick={() => setMobileOpen(false)}>
                  Dashboard
                </Link>
                <button onClick={() => { signOut(); setMobileOpen(false); }} className="block text-slate-400 py-2 text-sm">
                  Logout
                </button>
              </>
            ) : (
              <Link href="/login" className="block bg-sky-500 text-white text-center text-sm font-semibold px-4 py-2 rounded-lg mt-2" onClick={() => setMobileOpen(false)}>
                Login
              </Link>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
