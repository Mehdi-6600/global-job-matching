"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Menu,
  X,
  Briefcase,
  LayoutDashboard,
  Building2,
  MessageSquare,
  Bell,
  Settings,
  LogOut,
  User,
  ChevronDown,
  BookOpen,
  AlertTriangle,
  Calendar,
} from "lucide-react";

interface UserData {
  id: string;
  name: string | null;
  email: string;
  role: string;
  avatar: string | null;
}

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showProfile, setShowProfile] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    fetch("/api/profile")
      .then((res) => res.json())
      .then((data) => {
        if (data.profile) setUser(data.profile);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleSignOut = async () => {
    await fetch("/api/auth/signout", { method: "POST", credentials: "include" });
    window.location.href = "/";
  };

  const isEmployer = user?.role === "employer" || user?.role === "admin" || user?.role === "owner";
  const isAdmin = user?.role === "admin" || user?.role === "owner";

  const navLinks = [
    { href: "/jobs", label: "Jobs", icon: <Briefcase className="w-4 h-4" /> },
    { href: "/companies", label: "Companies", icon: <Building2 className="w-4 h-4" /> },
    { href: "/blog", label: "Blog", icon: <BookOpen className="w-4 h-4" /> },
    { href: "/pricing", label: "Pricing", icon: <Bell className="w-4 h-4" /> },
  ];

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center">
                <Briefcase className="w-4 h-4 text-white" />
              </div>
              <span className="text-lg font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                GJM
              </span>
            </Link>

            <div className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    isActive(link.href)
                      ? "text-cyan-400 bg-cyan-500/10"
                      : "text-slate-400 hover:text-white hover:bg-white/5"
                  }`}
                >
                  {link.icon}
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          <div className="hidden md:flex items-center gap-3">
            {!loading && !user && (
              <>
                <Link
                  href="/login"
                  className="text-sm text-slate-400 hover:text-white transition-colors px-3 py-2"
                >
                  Sign In
                </Link>
                <Link
                  href="/register"
                  className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white text-sm font-medium px-4 py-2 rounded-lg shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 transition-all"
                >
                  Get Started
                </Link>
              </>
            )}

            {!loading && user && (
              <div className="relative">
                <button
                  onClick={() => setShowProfile(!showProfile)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-white/5 transition-all"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/20 flex items-center justify-center">
                    {user.avatar ? (
                      <img src={user.avatar} alt="" className="w-8 h-8 rounded-full object-cover" />
                    ) : (
                      <User className="w-4 h-4 text-cyan-400" />
                    )}
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium text-white">{user.name || "User"}</p>
                    <p className="text-xs text-slate-500 capitalize">{user.role}</p>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${showProfile ? "rotate-180" : ""}`} />
                </button>

                {showProfile && (
                  <div className="absolute right-0 top-full mt-2 w-56 glass rounded-xl border border-white/10 shadow-2xl py-2">
                    <div className="px-4 py-2.5 border-b border-white/5">
                      <p className="text-sm font-medium text-white truncate">{user.name || "User"}</p>
                      <p className="text-xs text-slate-500 truncate">{user.email}</p>
                    </div>

                    <Link href="/dashboard" onClick={() => setShowProfile(false)} className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-300 hover:text-white hover:bg-white/5 transition-colors">
                      <LayoutDashboard className="w-4 h-4" /> Dashboard
                    </Link>
                    <Link href="/messages" onClick={() => setShowProfile(false)} className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-300 hover:text-white hover:bg-white/5 transition-colors">
                      <MessageSquare className="w-4 h-4" /> Messages
                    </Link>
                    <Link href="/notifications" onClick={() => setShowProfile(false)} className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-300 hover:text-white hover:bg-white/5 transition-colors">
                      <Bell className="w-4 h-4" /> Notifications
                    </Link>
                    <Link href="/saved-jobs" onClick={() => setShowProfile(false)} className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-300 hover:text-white hover:bg-white/5 transition-colors">
                      <Briefcase className="w-4 h-4" /> Saved Jobs
                    </Link>
                    <Link href="/my-applications" onClick={() => setShowProfile(false)} className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-300 hover:text-white hover:bg-white/5 transition-colors">
                      <Briefcase className="w-4 h-4" /> My Applications
                    </Link>
                    <Link href="/my-interviews" onClick={() => setShowProfile(false)} className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-300 hover:text-white hover:bg-white/5 transition-colors">
                      <Calendar className="w-4 h-4" /> My Interviews
                    </Link>
                    <Link href="/job-alerts" onClick={() => setShowProfile(false)} className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-300 hover:text-white hover:bg-white/5 transition-colors">
                      <AlertTriangle className="w-4 h-4" /> Job Alerts
                    </Link>
                    <Link href="/settings" onClick={() => setShowProfile(false)} className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-300 hover:text-white hover:bg-white/5 transition-colors">
                      <Settings className="w-4 h-4" /> Settings
                    </Link>

                    {isEmployer && (
                      <>
                        <div className="border-t border-white/5 my-1" />
                        <Link href="/employer/dashboard" onClick={() => setShowProfile(false)} className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-cyan-400 hover:bg-cyan-500/10 transition-colors">
                          <Building2 className="w-4 h-4" /> Employer Dashboard
                        </Link>
                        <Link href="/employer/post-job" onClick={() => setShowProfile(false)} className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-cyan-400 hover:bg-cyan-500/10 transition-colors">
                          <Briefcase className="w-4 h-4" /> Post a Job
                        </Link>
                      </>
                    )}

                    {isAdmin && (
                      <>
                        <div className="border-t border-white/5 my-1" />
                        <Link href="/admin" onClick={() => setShowProfile(false)} className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-amber-400 hover:bg-amber-500/10 transition-colors">
                          <LayoutDashboard className="w-4 h-4" /> Admin Panel
                        </Link>
                      </>
                    )}

                    <div className="border-t border-white/5 my-1" />
                    <button
                      onClick={() => { setShowProfile(false); handleSignOut(); }}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors text-left"
                    >
                      <LogOut className="w-4 h-4" /> Sign Out
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-all"
          >
            {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="md:hidden glass border-t border-white/10">
          <div className="px-4 py-3 space-y-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setIsOpen(false)}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive(link.href)
                    ? "text-cyan-400 bg-cyan-500/10"
                    : "text-slate-400 hover:text-white hover:bg-white/5"
                }`}
              >
                {link.icon}
                {link.label}
              </Link>
            ))}

            {!loading && !user && (
              <div className="pt-2 border-t border-white/5 mt-2 space-y-1">
                <Link href="/login" onClick={() => setIsOpen(false)} className="block px-3 py-2.5 text-sm text-slate-400 hover:text-white transition-colors">
                  Sign In
                </Link>
                <Link href="/register" onClick={() => setIsOpen(false)} className="block px-3 py-2.5 text-sm bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-lg font-medium text-center">
                  Get Started
                </Link>
              </div>
            )}

            {!loading && user && (
              <div className="pt-2 border-t border-white/5 mt-2 space-y-1">
                <Link href="/dashboard" onClick={() => setIsOpen(false)} className="flex items-center gap-2.5 px-3 py-2.5 text-sm text-slate-300 hover:text-white transition-colors">
                  <LayoutDashboard className="w-4 h-4" /> Dashboard
                </Link>
                <Link href="/messages" onClick={() => setIsOpen(false)} className="flex items-center gap-2.5 px-3 py-2.5 text-sm text-slate-300 hover:text-white transition-colors">
                  <MessageSquare className="w-4 h-4" /> Messages
                </Link>
                <Link href="/notifications" onClick={() => setIsOpen(false)} className="flex items-center gap-2.5 px-3 py-2.5 text-sm text-slate-300 hover:text-white transition-colors">
                  <Bell className="w-4 h-4" /> Notifications
                </Link>
                <Link href="/saved-jobs" onClick={() => setIsOpen(false)} className="flex items-center gap-2.5 px-3 py-2.5 text-sm text-slate-300 hover:text-white transition-colors">
                  <Briefcase className="w-4 h-4" /> Saved Jobs
                </Link>
                <Link href="/my-applications" onClick={() => setIsOpen(false)} className="flex items-center gap-2.5 px-3 py-2.5 text-sm text-slate-300 hover:text-white transition-colors">
                  <Briefcase className="w-4 h-4" /> My Applications
                </Link>
                <Link href="/my-interviews" onClick={() => setIsOpen(false)} className="flex items-center gap-2.5 px-3 py-2.5 text-sm text-slate-300 hover:text-white transition-colors">
                  <Calendar className="w-4 h-4" /> My Interviews
                </Link>
                <Link href="/job-alerts" onClick={() => setIsOpen(false)} className="flex items-center gap-2.5 px-3 py-2.5 text-sm text-slate-300 hover:text-white transition-colors">
                  <AlertTriangle className="w-4 h-4" /> Job Alerts
                </Link>
                <Link href="/settings" onClick={() => setIsOpen(false)} className="flex items-center gap-2.5 px-3 py-2.5 text-sm text-slate-300 hover:text-white transition-colors">
                  <Settings className="w-4 h-4" /> Settings
                </Link>

                {isEmployer && (
                  <>
                    <div className="border-t border-white/5 my-1" />
                    <Link href="/employer/dashboard" onClick={() => setIsOpen(false)} className="flex items-center gap-2.5 px-3 py-2.5 text-sm text-cyan-400 transition-colors">
                      <Building2 className="w-4 h-4" /> Employer Dashboard
                    </Link>
                    <Link href="/employer/post-job" onClick={() => setIsOpen(false)} className="flex items-center gap-2.5 px-3 py-2.5 text-sm text-cyan-400 transition-colors">
                      <Briefcase className="w-4 h-4" /> Post a Job
                    </Link>
                  </>
                )}

                {isAdmin && (
                  <>
                    <div className="border-t border-white/5 my-1" />
                    <Link href="/admin" onClick={() => setIsOpen(false)} className="flex items-center gap-2.5 px-3 py-2.5 text-sm text-amber-400 transition-colors">
                      <LayoutDashboard className="w-4 h-4" /> Admin Panel
                    </Link>
                  </>
                )}

                <div className="border-t border-white/5 my-1" />
                <button
                  onClick={() => { setIsOpen(false); handleSignOut(); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-red-400 transition-colors text-left"
                >
                  <LogOut className="w-4 h-4" /> Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
