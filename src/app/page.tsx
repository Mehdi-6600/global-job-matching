import Link from "next/link";
import { Globe, Zap, Bell, Search } from "lucide-react";
import Newsletter from "./components/Newsletter";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Hero */}
      <section className="pt-28 pb-16 px-5 text-center">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-white mb-5 leading-[1.15] tracking-tight">
            Find Your <span className="text-sky-400">Dream Job</span>
            <br />
            Anywhere
          </h1>

          <p className="text-[15px] sm:text-lg text-slate-400 mb-9 leading-relaxed max-w-lg mx-auto">
            Discover global opportunities, filter by role and location, and
            apply in minutes — free to start.
          </p>

          <div className="flex flex-col sm:flex-row justify-center gap-3.5">
            <Link
              href="/jobs"
              className="px-8 py-4 rounded-full bg-sky-500 text-white font-semibold text-[15px] shadow-lg shadow-sky-500/30 hover:bg-sky-400 active:scale-[0.97] transition-all duration-200"
            >
              Browse Jobs
            </Link>

            <Link
              href="/register"
              className="px-8 py-4 rounded-full font-semibold text-[15px] bg-white/5 text-white border border-white/10 hover:bg-white/10 active:scale-[0.97] transition-all duration-200"
            >
              Create Account
            </Link>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="px-5 pb-14">
        <div className="max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { value: "90+", label: "Companies" },
            { value: "100+", label: "Open Roles" },
            { value: "Free", label: "To Get Started" },
          ].map((item) => (
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

      {/* Features */}
      <section className="px-5 pb-24">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-[26px] sm:text-3xl font-bold text-center text-white mb-10 tracking-tight">
            Everything You Need to Succeed
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                icon: <Search className="w-5 h-5 text-sky-400" />,
                title: "Smart Search",
                desc: "Filter by role, location, remote and salary to find the right fit faster.",
              },
              {
                icon: <Globe className="w-5 h-5 text-sky-400" />,
                title: "Global Reach",
                desc: "Access job listings from companies worldwide in one place.",
              },
              {
                icon: <Bell className="w-5 h-5 text-sky-400" />,
                title: "Job Alerts",
                desc: "Save searches and get notified when new matching roles appear.",
              },
              {
                icon: <Zap className="w-5 h-5 text-sky-400" />,
                title: "Fast Apply",
                desc: "Build your profile once and apply to roles in a few clicks.",
              },
            ].map((feature) => (
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

      {/* Newsletter */}
      <section className="px-5 pb-24">
        <div className="max-w-4xl mx-auto">
          <Newsletter />
        </div>
      </section>
    </main>
  );
}
