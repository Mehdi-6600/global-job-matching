"use client";

import Link from "next/link";
import {
  Globe,
  Zap,
  Bell,
  Search,
  ShieldAlert,
  MapPin,
  Layers,
  Building2,
  BookOpen,
  FileText,
} from "lucide-react";
import Newsletter from "./components/Newsletter";
import { useLocale } from "@/components/locale-provider";

export default function HomePage() {
  const { t } = useLocale();

  const stats = [
    {
      value: "90+",
      label: t("Home.statCompanies", "Companies"),
    },
    {
      value: "100+",
      label: t("Home.statRoles", "Open Roles"),
    },
    {
      value: t("Home.statFreeValue", "Free"),
      label: t("Home.statFreeLabel", "To Get Started"),
    },
  ];

  const features = [
    {
      icon: <Search className="w-5 h-5 text-sky-400" />,
      title: t("Home.featureSearchTitle", "Smart Search"),
      desc: t(
        "Home.featureSearchDesc",
        "Filter by role, location, remote and salary to find the right fit faster."
      ),
    },
    {
      icon: <Globe className="w-5 h-5 text-sky-400" />,
      title: t("Home.featureGlobalTitle", "Global Reach"),
      desc: t(
        "Home.featureGlobalDesc",
        "Access job listings from companies worldwide in one place."
      ),
    },
    {
      icon: <Bell className="w-5 h-5 text-sky-400" />,
      title: t("Home.featureAlertsTitle", "Job Alerts"),
      desc: t(
        "Home.featureAlertsDesc",
        "Save searches and get notified when new matching roles appear."
      ),
    },
    {
      icon: <Zap className="w-5 h-5 text-sky-400" />,
      title: t("Home.featureApplyTitle", "Fast Apply"),
      desc: t(
        "Home.featureApplyDesc",
        "Build your profile once and apply to roles in a few clicks."
      ),
    },
  ];

  const hubs = [
    {
      href: "/jobs",
      icon: <Search className="w-5 h-5 text-sky-400" />,
      title: t("Home.hubJobs", "Browse jobs"),
      desc: t("Home.hubJobsDesc", "Search active listings worldwide."),
    },
    {
      href: "/locations",
      icon: <MapPin className="w-5 h-5 text-cyan-400" />,
      title: t("Home.hubLocations", "By location"),
      desc: t(
        "Home.hubLocationsDesc",
        "Country and city hubs with real open roles."
      ),
    },
    {
      href: "/categories",
      icon: <Layers className="w-5 h-5 text-indigo-400" />,
      title: t("Home.hubCategories", "By category"),
      desc: t(
        "Home.hubCategoriesDesc",
        "Explore roles grouped by field and skill area."
      ),
    },
    {
      href: "/companies",
      icon: <Building2 className="w-5 h-5 text-emerald-400" />,
      title: t("Home.hubCompanies", "Companies"),
      desc: t(
        "Home.hubCompaniesDesc",
        "Profiles of employers hiring on the platform."
      ),
    },
    {
      href: "/blog",
      icon: <BookOpen className="w-5 h-5 text-amber-400" />,
      title: t("Home.hubBlog", "Career blog"),
      desc: t("Home.hubBlogDesc", "Guides and tips for seekers and employers."),
    },
    {
      href: "/resume-builder",
      icon: <FileText className="w-5 h-5 text-violet-400" />,
      title: t("Home.hubResume", "Resume builder"),
      desc: t(
        "Home.hubResumeDesc",
        "Generate a professional resume with AI support."
      ),
    },
  ];

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <section className="pt-28 pb-16 px-5 text-center">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-white mb-5 leading-[1.15] tracking-tight">
            {t("Home.title", "Find Your Next Job Anywhere")}
          </h1>

          <p className="text-[15px] sm:text-lg text-slate-400 mb-9 leading-relaxed max-w-lg mx-auto">
            {t(
              "Home.subtitle",
              "Global job matching powered by AI. Free to start."
            )}
          </p>

          <div className="flex flex-col sm:flex-row justify-center gap-3.5">
            <Link
              href="/jobs"
              className="px-8 py-4 rounded-full bg-sky-500 text-white font-semibold text-[15px] shadow-lg shadow-sky-500/30 hover:bg-sky-400 active:scale-[0.97] transition-all duration-200"
            >
              {t("Home.ctaJobs", "Browse Jobs")}
            </Link>

            <Link
              href="/register"
              className="px-8 py-4 rounded-full font-semibold text-[15px] bg-white/5 text-white border border-white/10 hover:bg-white/10 active:scale-[0.97] transition-all duration-200"
            >
              {t("Home.ctaRegister", "Get Started")}
            </Link>
          </div>
        </div>
      </section>

      <section className="px-5 pb-14">
        <div className="max-w-4xl mx-auto rounded-3xl border border-cyan-500/20 bg-gradient-to-br from-cyan-500/10 via-white/5 to-blue-600/10 p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center gap-5">
            <div className="w-14 h-14 rounded-2xl bg-cyan-500/20 border border-cyan-400/30 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-7 h-7 text-cyan-300" />
            </div>
            <div className="flex-1 text-left">
              <h2 className="text-lg sm:text-xl font-bold text-white mb-1">
                {t("Home.careerRiskTitle", "Is your job at risk from AI?")}
              </h2>
              <p className="text-sm text-slate-400 leading-relaxed">
                {t(
                  "Home.careerRiskDesc",
                  "Get a clear risk score, skills to build, and smarter next steps — free to start."
                )}
              </p>
            </div>
            <Link
              href="/career-risk"
              className="shrink-0 inline-flex justify-center px-6 py-3.5 rounded-full bg-cyan-500 text-white font-semibold text-sm shadow-lg shadow-cyan-500/25 hover:bg-cyan-400 active:scale-[0.97] transition-all"
            >
              {t("Home.careerRiskCta", "Check my risk")}
            </Link>
          </div>
        </div>
      </section>

      <section className="px-5 pb-14">
        <div className="max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-4">
          {stats.map((item) => (
            <div
              key={item.label}
              className="rounded-2xl py-7 px-5 text-center bg-white/5 border border-white/10"
            >
              <div className="text-[32px] font-bold text-sky-400 leading-none mb-1.5">
                {item.value}
              </div>
              <div className="text-[13px] text-slate-400 font-medium">
                {item.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Internal linking hubs — crawlable from homepage */}
      <section className="px-5 pb-16">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-[22px] sm:text-2xl font-bold text-center text-white mb-8 tracking-tight">
            {t("Home.hubsTitle", "Explore the platform")}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {hubs.map((hub) => (
              <Link
                key={hub.href}
                href={hub.href}
                className="rounded-2xl p-5 bg-white/5 border border-white/10 hover:border-sky-500/30 transition-all active:scale-[0.98] text-left"
              >
                <div className="w-10 h-10 rounded-xl bg-sky-500/15 flex items-center justify-center mb-3">
                  {hub.icon}
                </div>
                <h3 className="text-[15px] font-semibold text-white mb-1">
                  {hub.title}
                </h3>
                <p className="text-[13px] text-slate-400 leading-relaxed">
                  {hub.desc}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="px-5 pb-24">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-[26px] sm:text-3xl font-bold text-center text-white mb-10 tracking-tight">
            {t("Home.featuresTitle", "Everything You Need to Succeed")}
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="rounded-2xl p-5 bg-white/5 border border-white/10 transition-transform duration-200 active:scale-[0.98]"
              >
                <div className="w-10 h-10 rounded-xl bg-sky-500/15 flex items-center justify-center mb-3.5">
                  {feature.icon}
                </div>
                <h3 className="text-[15px] font-semibold text-white mb-1.5">
                  {feature.title}
                </h3>
                <p className="text-[13px] text-slate-400 leading-relaxed">
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-5 pb-24">
        <div className="max-w-4xl mx-auto">
          <Newsletter />
        </div>
      </section>
    </main>
  );
}
