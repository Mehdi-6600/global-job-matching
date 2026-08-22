import Link from "next/link";
import { Globe, Zap, Bell, Headphones } from "lucide-react";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#f0f2f5] dark:bg-[#0b0d12] transition-colors duration-300">
      
      {/* Hero */}
      <section className="pt-28 pb-20 px-5 text-center">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 dark:text-white mb-6 leading-tight tracking-tight">
            Find Your <span className="text-[#3478F5]">Dream Job</span>
            <br />Anywhere
          </h1>
          
          <p className="text-base sm:text-lg text-gray-600 dark:text-gray-400 mb-10 leading-relaxed max-w-xl mx-auto">
            Global job matching powered by AI. Discover opportunities tailored to your skills and preferences — completely free to start.
          </p>

          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link
              href="/jobs"
              className="px-8 py-4 rounded-full bg-[#3478F5] text-white font-semibold text-[16px]
                shadow-[0_8px_25px_rgba(52,120,245,0.4)]
                hover:bg-[#5B9BF7] active:scale-95 transition-all"
            >
              Browse Jobs
            </Link>
            <Link
              href="/register"
              className="px-8 py-4 rounded-full font-semibold text-[16px]
                bg-white dark:bg-[#13151c]
                text-gray-800 dark:text-gray-200
                border border-gray-200 dark:border-[#2a2f3a]
                shadow-[0_4px_15px_rgba(0,0,0,0.06)] dark:shadow-[0_4px_15px_rgba(0,0,0,0.3)]
                hover:bg-gray-50 dark:hover:bg-[#1a1d27]
                active:scale-95 transition-all"
            >
              Create Account
            </Link>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="px-5 pb-16">
        <div className="max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { value: "500+", label: "Projects" },
            { value: "98%", label: "Satisfaction" },
            { value: "24/7", label: "Support" },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-2xl py-8 px-6 text-center
                bg-white dark:bg-[#13151c]
                border border-gray-100 dark:border-[#1e2330]
                shadow-[0_10px_30px_rgba(0,0,0,0.06)] 
                dark:shadow-[0_10px_30px_rgba(0,0,0,0.45)]"
            >
              <div className="text-4xl font-bold text-[#3478F5] mb-1">{item.value}</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">{item.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="px-5 pb-24">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-12">
            Everything You Need to Succeed
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              {
                icon: <Zap className="w-6 h-6 text-[#3478F5]" />,
                title: "Smart Matching",
                desc: "AI-powered algorithm connects you with the best opportunities.",
              },
              {
                icon: <Globe className="w-6 h-6 text-[#3478F5]" />,
                title: "Global Reach",
                desc: "Access job listings from companies worldwide.",
              },
              {
                icon: <Bell className="w-6 h-6 text-[#3478F5]" />,
                title: "Real-time Updates",
                desc: "Get instant notifications for new matches.",
              },
              {
                icon: <Headphones className="w-6 h-6 text-[#3478F5]" />,
                title: "24/7 Support",
                desc: "Dedicated support team ready to help anytime.",
              },
            ].map((feature) => (
              <div
                key={feature.title}
                className="rounded-2xl p-6
                  bg-white dark:bg-[#13151c]
                  border border-gray-100 dark:border-[#1e2330]
                  shadow-[0_10px_30px_rgba(0,0,0,0.06)] 
                  dark:shadow-[0_10px_30px_rgba(0,0,0,0.45)]
                  transition-transform duration-200 hover:-translate-y-1"
              >
                <div className="w-11 h-11 rounded-xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center mb-4">
                  {feature.icon}
                </div>
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
