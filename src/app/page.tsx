import Link from "next/link";
import { Globe, Zap, Bell, Headphones } from "lucide-react";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#f0f2f5] dark:bg-[#0b0d12] transition-colors duration-300">
      {/* Hero */}
      <section className="pt-24 pb-16 px-4 sm:px-6 lg:px-8 text-center">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 dark:text-white mb-6 leading-tight">
            Find Your <span className="text-[#3478F5]">Dream Job</span> Anywhere
          </h1>
          <p className="text-lg sm:text-xl text-gray-600 dark:text-gray-400 mb-10 max-w-2xl mx-auto leading-relaxed">
            Global job matching powered by AI. Discover opportunities tailored to your skills and preferences — completely free to start.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href="/jobs"
              className="px-8 py-3.5 rounded-full bg-[#3478F5] text-white font-semibold text-[16px]
                shadow-[0_6px_20px_rgba(52,120,245,0.35)]
                hover:bg-[#5B9BF7] active:scale-[0.98]
                transition-all"
            >
              Browse Jobs
            </Link>
            <Link
              href="/register"
              className="px-8 py-3.5 rounded-full border border-gray-300 dark:border-gray-600
                text-gray-800 dark:text-gray-200 font-semibold text-[16px]
                bg-white dark:bg-[#13151c]
                hover:bg-gray-50 dark:hover:bg-[#1a1d24]
                active:scale-[0.98] transition-all"
            >
              Create Account
            </Link>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-5">
          {[
            { value: "500+", label: "Projects" },
            { value: "98%", label: "Satisfaction" },
            { value: "24/7", label: "Support" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl p-6 text-center
                bg-white dark:bg-[#13151c]
                border border-gray-200/60 dark:border-[#1e2330]
                shadow-[0_8px_30px_rgba(0,0,0,0.06)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.4)]
                transition-all duration-300 hover:-translate-y-1"
            >
              <div className="text-3xl sm:text-4xl font-bold text-[#3478F5]">{stat.value}</div>
              <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white text-center mb-12">
            Everything You Need to Succeed
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              {
                icon: <Zap className="w-7 h-7 text-[#3478F5]" />,
                title: "Smart Matching",
                desc: "AI-powered algorithm connects you with the best opportunities.",
              },
              {
                icon: <Globe className="w-7 h-7 text-[#3478F5]" />,
                title: "Global Reach",
                desc: "Access job listings from companies worldwide.",
              },
              {
                icon: <Bell className="w-7 h-7 text-[#3478F5]" />,
                title: "Real-time Updates",
                desc: "Get instant notifications for new matches.",
              },
              {
                icon: <Headphones className="w-7 h-7 text-[#3478F5]" />,
                title: "24/7 Support",
                desc: "Dedicated support team ready to help anytime.",
              },
            ].map((feature) => (
              <div
                key={feature.title}
                className="rounded-2xl p-6
                  bg-white dark:bg-[#13151c]
                  border border-gray-200/60 dark:border-[#1e2330]
                  shadow-[0_8px_30px_rgba(0,0,0,0.06)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.4)]
                  transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
              >
                <div className="mb-4">{feature.icon}</div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  {feature.title}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
