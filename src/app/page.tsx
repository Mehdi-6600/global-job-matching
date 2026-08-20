import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Play, ChevronRight, Zap, Globe, Bell, Headphones, Sparkles } from "lucide-react";

export default function HomePage() {
  return (
    <div className="pt-16 overflow-x-hidden">
      {/* Hero - با نورپردازی و افکت‌های پیشرفته */}
      <section className="relative min-h-screen flex items-center overflow-hidden bg-black">
        {/* گرادیانت‌های زمینه با نورپردازی */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 via-purple-600/10 to-pink-600/20"></div>
        <div className="absolute top-[-40%] left-[-20%] w-[800px] h-[800px] bg-blue-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-[-40%] right-[-20%] w-[800px] h-[800px] bg-purple-500/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center opacity-20"></div>

        <div className="container mx-auto px-4 relative z-10 py-20">
          <div className="max-w-5xl mx-auto text-center">
            {/* نشانگر شیشه‌ای */}
            <div className="inline-flex items-center gap-2 bg-white/5 backdrop-blur-lg border border-white/10 px-6 py-2.5 rounded-full text-sm font-medium text-white/90 mb-8 shadow-lg shadow-blue-500/10">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-400"></span>
              </span>
              AI-Powered Job Matching Platform
              <Sparkles className="w-4 h-4 ml-1 text-blue-400" />
            </div>

            {/* عنوان با گرادیانت و درخشش */}
            <h1 className="text-6xl md:text-8xl lg:text-9xl font-bold tracking-tight mb-8">
              <span className="text-white">Find Your</span>
              <br />
              <span className="bg-gradient-to-r from-blue-400 via-cyan-300 to-purple-400 bg-clip-text text-transparent drop-shadow-[0_0_30px_rgba(59,130,246,0.3)]">
                Dream Job
              </span>
              <br />
              <span className="text-white/80">Anywhere</span>
            </h1>

            <p className="text-xl md:text-2xl text-white/70 max-w-2xl mx-auto mb-12 leading-relaxed">
              Global job matching powered by AI. Discover opportunities tailored to your skills and preferences — completely free to start.
            </p>

            {/* دکمه‌ها با افکت شیشه‌ای */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mb-20">
              <Link href="/register">
                <Button className="group relative px-10 py-7 text-lg rounded-2xl overflow-hidden bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-2xl shadow-blue-500/30 hover:shadow-blue-500/50 transition-all duration-500">
                  <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></span>
                  Get Started
                  <ChevronRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Button variant="outline" className="border-white/20 text-white hover:bg-white/10 px-10 py-7 text-lg rounded-2xl backdrop-blur-lg bg-white/5 shadow-lg shadow-white/5 hover:shadow-white/20 transition-all duration-300">
                <Play className="w-5 h-5 mr-2" />
                Watch Video
              </Button>
            </div>

            {/* آمار با کارت‌های شیشه‌ای و مرکزچین */}
            <div className="grid grid-cols-3 gap-6 max-w-2xl mx-auto">
              <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-6 text-center hover:bg-white/10 transition-all duration-300 shadow-lg shadow-white/5">
                <div className="text-4xl md:text-5xl font-bold text-white">500+</div>
                <div className="text-sm text-white/50">Projects</div>
              </div>
              <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-6 text-center hover:bg-white/10 transition-all duration-300 shadow-lg shadow-white/5">
                <div className="text-4xl md:text-5xl font-bold text-white">98%</div>
                <div className="text-sm text-white/50">Satisfaction</div>
              </div>
              <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-6 text-center hover:bg-white/10 transition-all duration-300 shadow-lg shadow-white/5">
                <div className="text-4xl md:text-5xl font-bold text-white">24/7</div>
                <div className="text-sm text-white/50">Support</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* خدمات - با کارت‌های شیشه‌ای و درخشش */}
      <section className="relative py-24 bg-gradient-to-b from-gray-900 via-gray-900 to-black overflow-hidden">
        <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center opacity-10"></div>
        <div className="absolute top-0 left-1/2 w-[600px] h-[600px] bg-blue-500/10 rounded-full blur-3xl -translate-x-1/2"></div>

        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="inline-block text-sm font-semibold text-blue-400 uppercase tracking-wider bg-blue-500/10 border border-blue-500/20 px-5 py-1.5 rounded-full mb-4">Features</span>
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Everything You Need to Succeed
            </h2>
            <p className="text-white/60 text-lg">
              Powerful tools and features to help you find the perfect job or hire the best talent.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: <Zap className="w-7 h-7 text-blue-400" />,
                title: "Smart Matching",
                desc: "AI-powered algorithm connects you with the best opportunities.",
                gradient: "from-blue-500/20 to-blue-600/20",
                border: "border-blue-500/20",
                glow: "shadow-blue-500/20"
              },
              {
                icon: <Globe className="w-7 h-7 text-purple-400" />,
                title: "Global Reach",
                desc: "Access job listings from companies worldwide.",
                gradient: "from-purple-500/20 to-purple-600/20",
                border: "border-purple-500/20",
                glow: "shadow-purple-500/20"
              },
              {
                icon: <Bell className="w-7 h-7 text-emerald-400" />,
                title: "Real-time Updates",
                desc: "Get instant notifications for new matches.",
                gradient: "from-emerald-500/20 to-emerald-600/20",
                border: "border-emerald-500/20",
                glow: "shadow-emerald-500/20"
              },
              {
                icon: <Headphones className="w-7 h-7 text-amber-400" />,
                title: "24/7 Support",
                desc: "Dedicated support team ready to help anytime.",
                gradient: "from-amber-500/20 to-amber-600/20",
                border: "border-amber-500/20",
                glow: "shadow-amber-500/20"
              }
            ].map((service, index) => (
              <div key={index} className={`relative group bg-gradient-to-br ${service.gradient} backdrop-blur-lg border ${service.border} rounded-3xl p-8 hover:scale-[1.02] transition-all duration-500 shadow-xl ${service.glow} hover:shadow-2xl`}>
                <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="relative z-10">
                  <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10 flex items-center justify-center mb-5 shadow-lg shadow-black/20 group-hover:shadow-xl transition-all duration-300">
                    {service.icon}
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2">{service.title}</h3>
                  <p className="text-white/60 text-sm leading-relaxed">{service.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
