"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Briefcase, Menu, X, Sun, Moon } from "lucide-react";
import { useState, useEffect } from "react";
import { useTheme } from "next-themes";

const navLinks = [
  { href: "/jobs", label: "Jobs" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/pricing", label: "Pricing" },
];

export default function Navbar() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = mounted && resolvedTheme === "dark";

  return (
    <nav className="sticky top-0 z-50 
      bg-white/80 dark:bg-[#0b0d12]/80 
      backdrop-blur-xl 
      border-b border-gray-200/60 dark:border-[#1e2330]
      transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 font-bold text-[#3478F5]">
            <Briefcase className="w-5 h-5" />
            <span className="text-[15px] sm:text-base">Global Job Matching</span>
          </Link>

          {/* Desktop Links */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  pathname === link.href
                    ? "bg-[#3478F5]/10 text-[#3478F5]"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                }`}
              >
                {link.label}
              </Link>
            ))}

            <button
              onClick={() => setTheme(isDark ? "light" : "dark")}
              className="p-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 transition ml-1"
              aria-label="Toggle theme"
            >
              {isDark ? (
                <Sun className="w-5 h-5 text-amber-400" />
              ) : (
                <Moon className="w-5 h-5 text-gray-600" />
              )}
            </button>

            <Link
              href="/login"
              className="ml-3 px-5 py-2 rounded-full bg-[#3478F5] text-white text-sm font-semibold
                shadow-[0_4px_14px_rgba(52,120,245,0.4)]
                hover:bg-[#2f6de0] active:scale-95 transition-all"
            >
              Sign In
            </Link>
          </div>

          {/* Mobile buttons */}
          <div className="md:hidden flex items-center gap-1">
            <button
              onClick={() => setTheme(isDark ? "light" : "dark")}
              className="p-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 transition"
              aria-label="Toggle theme"
            >
              {isDark ? (
                <Sun className="w-5 h-5 text-amber-400" />
              ) : (
                <Moon className="w-5 h-5 text-gray-600" />
              )}
            </button>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10"
            >
              {menuOpen ? (
                <X className="w-5 h-5 text-gray-800 dark:text-gray-200" />
              ) : (
                <Menu className="w-5 h-5 text-gray-800 dark:text-gray-200" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-gray-200 dark:border-[#1e2330] px-4 py-4 space-y-1 bg-white dark:bg-[#0b0d12]">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              className={`block px-4 py-3 rounded-xl text-sm font-medium ${
                pathname === link.href
                  ? "bg-[#3478F5]/10 text-[#3478F5]"
                  : "text-gray-600 dark:text-gray-400"
              }`}
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/login"
            onClick={() => setMenuOpen(false)}
            className="block mt-3 text-center px-5 py-3 rounded-full bg-[#3478F5] text-white text-sm font-semibold"
          >
            Sign In
          </Link>
        </div>
      )}
    </nav>
  );
}
