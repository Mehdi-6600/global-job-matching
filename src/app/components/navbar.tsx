"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Menu,
  X,
  Briefcase,
  Search,
  User,
  MessageSquare,
  Bell,
  Bookmark,
  Settings,
  HelpCircle,
  LayoutDashboard,
  PlusSquare,
  LogOut,
} from "lucide-react";

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const navLinks = [
    { href: "/", label: "Home" },
    { href: "/jobs", label: "Jobs" },
    { href: "/pricing", label: "Pricing" },
    { href: "/about", label: "About" },
    { href: "/contact", label: "Contact" },
  ];

  const userLinks = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/saved-jobs", label: "Saved Jobs", icon: Bookmark },
    { href: "/my-applications", label: "Applications", icon: Briefcase },
    { href: "/messages", label: "Messages", icon: MessageSquare },
    { href: "/notifications", label: "Notifications", icon: Bell },
    { href: "/settings", label: "Settings", icon: Settings },
    { href: "/help", label: "Help Center", icon: HelpCircle },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-slate-900/70 backdrop-blur-xl border-b border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center">
              <Briefcase className="w-4 h-4 text-white" />
            </div>
            <span className="text-white font-bold text-lg hidden sm:block">GlobalJob</span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-slate-300 hover:text-white hover:bg-white/5 px-3 py-2 rounded-xl text-sm font-medium transition-all"
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Desktop Right */}
          <div className="hidden md:flex items-center gap-2">
            <Link
              href="/jobs"
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-all"
            >
              <Search className="w-4 h-4" />
            </Link>
            <Link
              href="/notifications"
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-all relative"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
            </Link>
            <Link
              href="/messages"
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-all"
            >
              <MessageSquare className="w-4 h-4" />
            </Link>

            {/* User Dropdown */}
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 p-1.5 pr-3 rounded-xl hover:bg-white/5 transition-all"
              >
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/20 flex items-center justify-center">
                  <User className="w-3.5 h-3.5 text-cyan-400" />
                </div>
                <span className="text-slate-300 text-sm">Account</span>
              </button>

              {userMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setUserMenuOpen(false)}
                  />
                  <div className="absolute right-0 top-full mt-2 w-56 glass rounded-2xl p-2 border border-white/10 shadow-2xl z-50">
                    {userLinks.map((link) => {
                      const Icon = link.icon;
                      return (
                        <Link
                          key={link.href}
                          href={link.href}
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-300 hover:text-white hover:bg-white/5 text-sm transition-all"
                        >
                          <Icon className="w-4 h-4" />
                          {link.label}
                        </Link>
                      );
                    })}
                    <div className="h-px bg-white/5 my-1" />
                    <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-red-400 hover:bg-red-500/10 text-sm transition-all">
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </button>
                  </div>
                </>
              )}
            </div>

            <Link
              href="/employer/post-job"
              className="flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white px-4 py-2 rounded-xl text-sm font-medium transition-all"
            >
              <PlusSquare className="w-4 h-4" />
              Post Job
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-all"
          >
            {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden glass border-t border-white/5">
          <div className="px-4 py-3 space-y-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setIsOpen(false)}
                className="block text-slate-300 hover:text-white hover:bg-white/5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
              >
                {link.label}
              </Link>
            ))}
            <div className="h-px bg-white/5 my-2" />
            {userLinks.map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-3 text-slate-300 hover:text-white hover:bg-white/5 px-3 py-2.5 rounded-xl text-sm transition-all"
                >
                  <Icon className="w-4 h-4" />
                  {link.label}
                </Link>
              );
            })}
            <div className="h-px bg-white/5 my-2" />
            <Link
              href="/employer/post-job"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
            >
              <PlusSquare className="w-4 h-4" />
              Post a Job
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
