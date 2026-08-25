import Link from "next/link";
import { Globe, Zap, Bell, Headphones } from "lucide-react";
import Newsletter from "./components/Newsletter";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#eef1f5] dark:bg-[#080a0e] transition-colors duration-300">
      
      {/* Hero */}
      <section className="pt-28 pb-16 px-5 text-center">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 dark:text-white mb-5 leading-[1.15] tracking-tight">
            Find Your <span className="text-[#3478F5]">Dream Job</span>
            <br />Anywhere
          </h1>
          
          <p className="text-[15px] sm:text-lg text-gray-600 dark:text-gray-400 mb-9 leading-relaxed max-w-md mx-auto">
            Global job matching powered by AI. Discover opportunities tailored to your skills and preferences — completely free to start.
          </p>

          <div className="flex flex-col sm:flex-row justify-center gap-3.5">
            <Link
              href="/jobs"
              className="px-8 py-4 rounded-full bg-[#3478F5] text-white font-semibold text-[15px]
                shadow-[0_10px_25px_-3px_rgba(52,120,245,0.55)]
                hover:shadow-[0_12px_28px_-3px_rgba(52,120,245,0.65)]
                hover:bg-[#2f6de0]
                active:scale-[0.97] active:shadow-[0_4px_12px_rgba(52,120,245,0.4)]
                transition-all duration-200"
            >
              Browse Jobs
            </Link>

            <Link
              href="/register"
              className="px-8 py-4 rounded-full font-semibold text-[15px]
                bg-white dark:bg-[#151820]
                text-gray-800 dark:text-gray-100
                border border-gray-200/80 dark:border-[#2a2f3c]
                shadow-[0_8px_20px_-4px_rgba(0,0,0,0.12)]
                dark:shadow-[0_8px_20px_-4px_rgba(0,0,0,0.55)]
                hover:shadow-[0_10px_25px_-4px_rgba(0,0,0,0.16)]
                dark:hover:shadow-[0_10px_25px_-4px_rgba(0,0,0,0.65)]
                active:scale-[0.97]
                transition-all duration-200"
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
            { value: "500+", label: "Projects" },
            { value: "98%", label: "Satisfaction" },
            { value: "24/7", label: "Support" },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-2xl py-7 px-5 text-center
                bg-white dark:bg-[#151820]
                border border-gray-100 dark:border-[#222733]
                shadow-[0_12px_30px_-6px_rgba(0,0,0,0.12)]
                dark:shadow-[0_12px_30px_-6px_rgba(0,0,0,0.55)]"
            >
              <div className="text-[32px] font-bold text-[#3478F5] leading-none mb-1.5">
                {item.value}
              </div>
              <div className="text-[13px] text-gray-500 dark:text-gray-400 font-medium">
                {item.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="px-5 pb-24">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-[26px] sm:text-3xl font-bold text-center text-gray-900 dark:text-white mb-10 tracking-tight">
            Everything You Need to Succeed
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                icon: <Zap className="w-5 h-5 text-[#3478F5]" />,
                title: "Smart Matching",
                desc: "AI-powered algorithm connects you with the best opportunities.",
              },
              {
                icon: <Globe className="w-5 h-5 text-[#3478F5]" />,
                title: "Global Reach",
                desc: "Access job listings from companies worldwide.",
              },
              {
                icon: <Bell className="w-5 h-5 text-[#3478F5]" />,
                title: "Real-time Updates",
                desc: "Get instant notifications for new matches.",
              },
              {
                icon: <Headphones className="w-5 h-5 text-[#3478F5]" />,
                title: "24/7 Support",
                desc: "Dedicated support team ready to help anytime.",
              },
            ].map((feature) => (
              <div
                key={feature.title}
                className="rounded-2xl p-5
                  bg-white dark:bg-[#151820]
                  border border-gray-100 dark:border-[#222733]
                  shadow-[0_12px_30px_-6px_rgba(0,0,0,0.12)]
                  dark:shadow-[0_12px_30px_-6px_rgba(0,0,0,0.55)]
                  transition-transform duration-200 active:scale-[0.98]"
              >
                <div className="w-10 h-10 rounded-xl bg-[#3478F5]/10 dark:bg-[#3478F5]/15 flex items-center justify-center mb-3.5">
                  {feature.icon}
                </div>
                <h3 className="text-[15px] font-semibold text-gray-900 dark:text-white mb-1.5">
                  {feature.title}
                </h3>
                <p className="text-[13px] text-gray-600 dark:text-gray-400 leading-relaxed">
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
