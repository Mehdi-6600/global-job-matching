import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Play, ChevronRight, Zap, Globe, Bell, Headphones, Briefcase, Users, Award } from "lucide-react";

export default function HomePage() {
  return (
    <div className="pt-16">
      {/* Hero - با گرادیانت جذاب‌تر */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 text-white">
        <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center opacity-10"></div>
        <div className="container mx-auto px-4 py-32 md:py-40 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm text-white/90 px-5 py-2 rounded-full text-sm font-medium mb-8 border border-white/10">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-400"></span>
              </span>
              AI-Powered Job Matching Platform
            </div>

            <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight mb-8">
              Find Your{' '}
              <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-indigo-400 bg-clip-text text-transparent">
                Dream Job
              </span>
              <br />
              Anywhere
            </h1>

            <p className="text-xl md:text-2xl text-blue-100/90 max-w-2xl mx-auto mb-12 leading-relaxed">
              Global job matching powered by AI. Discover opportunities tailored to your skills and preferences — completely free to start.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-20">
              <Link href="/register">
                <Button size="lg" className="bg-white text-blue-700 hover:bg-blue-50 px-10 py-7 text-lg rounded-2xl shadow-2xl shadow-blue-500/30 hover:shadow-blue-500/50 transition-all duration-300">
                  Get Started
                  <ChevronRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
              <Button size="lg" variant="outline" className="border-white/20 text-white hover:bg-white/10 px-10 py-7 text-lg rounded-2xl backdrop-blur-sm">
                <Play className="w-5 h-5 mr-2" />
                Watch Video
              </Button>
            </div>

            {/* آمار با رنگ و اندازه بهتر */}
            <div className="grid grid-cols-3 gap-8 max-w-2xl mx-auto border-t border-white/10 pt-12">
              <div className="text-center">
                <div className="text-4xl font-bold text-white">500+</div>
                <div className="text-sm text-blue-200">Projects</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-white">98%</div>
                <div className="text-sm text-blue-200">Satisfaction</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-white">24/7</div>
                <div className="text-sm text-blue-200">Support</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* برندها - با استایل شفاف */}
      <section className="py-16 bg-white border-y border-gray-100">
        <div className="container mx-auto px-4">
          <p className="text-center text-sm text-gray-400 uppercase tracking-wider mb-10 font-medium">
            Trusted by 500+ companies worldwide
          </p>
          <div className="flex flex-wrap items-center justify-center gap-12 md:gap-16 grayscale opacity-50 hover:grayscale-0 hover:opacity-100 transition-all duration-500">
            <span className="text-2xl font-bold text-gray-600">Google</span>
            <span className="text-2xl font-bold text-gray-600">Microsoft</span>
            <span className="text-2xl font-bold text-gray-600">Slack</span>
            <span className="text-2xl font-bold text-gray-600">Dropbox</span>
            <span className="text-2xl font-bold text-gray-600">GitHub</span>
          </div>
        </div>
      </section>

      {/* خدمات - با کارت‌های برجسته */}
      <section className="py-24 bg-gradient-to-b from-gray-50 to-white">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-sm font-semibold text-blue-600 uppercase tracking-wider bg-blue-50 px-4 py-1.5 rounded-full">Features</span>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mt-4 mb-4">
              Everything You Need to Succeed
            </h2>
            <p className="text-gray-600 text-lg">
              Powerful tools and features to help you find the perfect job or hire the best talent.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-xl shadow-gray-100/50 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 group">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mb-5 shadow-lg shadow-blue-200 group-hover:scale-110 transition">
                <Zap className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Smart Matching</h3>
              <p className="text-gray-600 text-sm leading-relaxed">AI-powered algorithm connects you with the best opportunities.</p>
            </div>

            <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-xl shadow-gray-100/50 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 group">
              <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center mb-5 shadow-lg shadow-purple-200 group-hover:scale-110 transition">
                <Globe className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Global Reach</h3>
              <p className="text-gray-600 text-sm leading-relaxed">Access job listings from companies worldwide in one place.</p>
            </div>

            <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-xl shadow-gray-100/50 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 group">
              <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl flex items-center justify-center mb-5 shadow-lg shadow-emerald-200 group-hover:scale-110 transition">
                <Bell className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Real-time Updates</h3>
              <p className="text-gray-600 text-sm leading-relaxed">Get instant notifications for new job matches and applications.</p>
            </div>

            <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-xl shadow-gray-100/50 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 group">
              <div className="w-14 h-14 bg-gradient-to-br from-amber-500 to-amber-600 rounded-2xl flex items-center justify-center mb-5 shadow-lg shadow-amber-200 group-hover:scale-110 transition">
                <Headphones className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">24/7 Support</h3>
              <p className="text-gray-600 text-sm leading-relaxed">Dedicated support team ready to help you at any time.</p>
            </div>
          </div>
        </div>
      </section>

      {/* About - با طراحی بصری قوی‌تر */}
      <section className="py-24 bg-white">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <span className="text-sm font-semibold text-blue-600 uppercase tracking-wider bg-blue-50 px-4 py-1.5 rounded-full">About Us</span>
              <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mt-4 mb-6">
                Why Global<span className="text-blue-600">Job</span>?
              </h2>
              <p className="text-gray-600 text-lg leading-relaxed mb-8">
                We connect talented professionals with global opportunities using cutting-edge AI technology.
                Our platform is designed to make job searching simple, fast, and effective.
              </p>
              <div className="space-y-5">
                <div className="flex items-start gap-4 p-4 rounded-2xl hover:bg-gray-50 transition-colors">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 text-white flex items-center justify-center flex-shrink-0 shadow-lg shadow-blue-200">✓</div>
                  <div>
                    <h4 className="font-semibold text-gray-900">AI-Powered Matching</h4>
                    <p className="text-gray-600 text-sm">Our algorithm learns your preferences and finds the perfect match.</p>
                  </div>
                </div>
                <div className="flex items-start gap-4 p-4 rounded-2xl hover:bg-gray-50 transition-colors">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 text-white flex items-center justify-center flex-shrink-0 shadow-lg shadow-indigo-200">✓</div>
                  <div>
                    <h4 className="font-semibold text-gray-900">Global Opportunities</h4>
                    <p className="text-gray-600 text-sm">Access job listings from companies around the world.</p>
                  </div>
                </div>
                <div className="flex items-start gap-4 p-4 rounded-2xl hover:bg-gray-50 transition-colors">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 text-white flex items-center justify-center flex-shrink-0 shadow-lg shadow-emerald-200">✓</div>
                  <div>
                    <h4 className="font-semibold text-gray-900">Secure & Private</h4>
                    <p className="text-gray-600 text-sm">Your data is protected with enterprise-grade security.</p>
                  </div>
                </div>
              </div>
              <Link href="/about">
                <Button className="mt-8 bg-blue-600 hover:bg-blue-700 text-white px-8 py-6 rounded-xl shadow-lg shadow-blue-200 hover:shadow-xl transition-all duration-300">
                  Learn More →
                </Button>
              </Link>
            </div>
            <div className="relative">
              <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl p-10 text-white shadow-2xl shadow-indigo-200/50">
                <div className="text-7xl font-bold mb-4">AI</div>
                <p className="text-xl text-blue-100">Cutting-edge technology for job matching</p>
                <div className="mt-8 flex items-center gap-4 bg-white/10 backdrop-blur-sm rounded-2xl p-4">
                  <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-2xl">🚀</div>
                  <div>
                    <p className="font-medium">98% Success Rate</p>
                    <p className="text-sm text-blue-200">Based on user satisfaction</p>
                  </div>
                </div>
              </div>
              <div className="absolute -bottom-4 -right-4 w-32 h-32 bg-gradient-to-br from-cyan-300 to-blue-300 rounded-full opacity-20 blur-2xl"></div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA - فراخوان نهایی */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-indigo-700 text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to Find Your Dream Job?</h2>
          <p className="text-blue-100 text-lg max-w-2xl mx-auto mb-8">Join thousands of professionals who found their perfect match with GlobalJob.</p>
          <Link href="/register">
            <Button className="bg-white text-blue-700 hover:bg-blue-50 px-10 py-7 text-lg rounded-2xl shadow-2xl shadow-blue-500/30">
              Get Started Now
              <ChevronRight className="w-5 h-5 ml-2" />
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
