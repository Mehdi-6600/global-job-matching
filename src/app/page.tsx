import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Play, ChevronRight } from "lucide-react";

export default function HomePage() {
  return (
    <div className="pt-16">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-white to-indigo-50">
        <div className="container mx-auto px-4 py-24 md:py-32">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 px-4 py-1.5 rounded-full text-sm font-medium mb-6">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-600"></span>
              </span>
              AI-Powered Job Matching
            </div>

            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight text-gray-900 mb-6">
              Find Your{' '}
              <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Dream Job
              </span>
              {' '}Anywhere
            </h1>

            <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto mb-10 leading-relaxed">
              Global job matching powered by AI. Discover opportunities tailored to your skills and preferences — completely free to start.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
              <Link href="/register">
                <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-6 text-lg rounded-xl shadow-lg shadow-blue-200 hover:shadow-xl transition-all duration-200">
                  Get Started
                  <ChevronRight className="w-5 h-5 ml-1" />
                </Button>
              </Link>
              <Button size="lg" variant="outline" className="px-8 py-6 text-lg rounded-xl border-gray-200 hover:bg-gray-50">
                <Play className="w-5 h-5 mr-2 text-blue-600" />
                Watch Video
              </Button>
            </div>

            <div className="grid grid-cols-3 gap-6 max-w-2xl mx-auto">
              <div className="text-center">
                <div className="text-3xl font-bold text-gray-900">500+</div>
                <div className="text-sm text-gray-500">Projects</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-gray-900">98%</div>
                <div className="text-sm text-gray-500">Satisfaction</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-gray-900">24/7</div>
                <div className="text-sm text-gray-500">Support</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* برندها */}
      <section className="py-12 border-y border-gray-100 bg-white">
        <div className="container mx-auto px-4">
          <p className="text-center text-sm text-gray-500 uppercase tracking-wider mb-8">
            Trusted by 500+ companies worldwide
          </p>
          <div className="flex flex-wrap items-center justify-center gap-8 md:gap-12 grayscale opacity-60">
            <span className="text-xl font-bold text-gray-400">Google</span>
            <span className="text-xl font-bold text-gray-400">Microsoft</span>
            <span className="text-xl font-bold text-gray-400">Slack</span>
            <span className="text-xl font-bold text-gray-400">Dropbox</span>
            <span className="text-xl font-bold text-gray-400">GitHub</span>
          </div>
        </div>
      </section>

      {/* خدمات */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Everything You Need to Succeed
            </h2>
            <p className="text-gray-600 text-lg">
              Powerful tools and features to help you find the perfect job or hire the best talent.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                title: "Smart Matching",
                desc: "AI-powered algorithm connects you with the best opportunities.",
                icon: "M9.75 17L15 11.75M9.75 17l-5.25-5.25M9.75 17l5.25-5.25",
                color: "blue"
              },
              {
                title: "Global Reach",
                desc: "Access job listings from companies worldwide in one place.",
                icon: "M12 4.5v15m7.5-7.5h-15",
                color: "purple"
              },
              {
                title: "Real-time Updates",
                desc: "Get instant notifications for new job matches and applications.",
                icon: "M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5",
                color: "green"
              },
              {
                title: "24/7 Support",
                desc: "Dedicated support team ready to help you at any time.",
                icon: "M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5",
                color: "yellow"
              }
            ].map((service, index) => (
              <div key={index} className="bg-white p-6 rounded-2xl border border-gray-100 hover:shadow-lg transition-shadow">
                <div className={`w-12 h-12 bg-${service.color}-100 rounded-xl flex items-center justify-center mb-4`}>
                  <svg className={`w-6 h-6 text-${service.color}-600`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d={service.icon} />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{service.title}</h3>
                <p className="text-gray-600 text-sm">{service.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* About / Why Us (جدید) */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <span className="text-sm font-semibold text-blue-600 uppercase tracking-wider">About Us</span>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mt-2 mb-6">
                Why Global<span className="text-blue-600">Job</span>?
              </h2>
              <p className="text-gray-600 text-lg mb-6">
                We connect talented professionals with global opportunities using cutting-edge AI technology.
                Our platform is designed to make job searching simple, fast, and effective.
              </p>
              <ul className="space-y-4 mb-8">
                <li className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-bold mt-0.5">✓</span>
                  <div>
                    <h4 className="font-semibold text-gray-900">AI-Powered Matching</h4>
                    <p className="text-gray-600 text-sm">Our algorithm learns your preferences and finds the perfect match.</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-sm font-bold mt-0.5">✓</span>
                  <div>
                    <h4 className="font-semibold text-gray-900">Global Opportunities</h4>
                    <p className="text-gray-600 text-sm">Access job listings from companies around the world.</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-sm font-bold mt-0.5">✓</span>
                  <div>
                    <h4 className="font-semibold text-gray-900">Secure & Private</h4>
                    <p className="text-gray-600 text-sm">Your data is protected with enterprise-grade security.</p>
                  </div>
                </li>
              </ul>
              <Link href="/about">
                <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                  Learn More →
                </Button>
              </Link>
            </div>
            <div className="relative">
              <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-3xl p-8 text-white">
                <div className="text-6xl font-bold mb-4">AI</div>
                <p className="text-lg opacity-90">Cutting-edge technology for job matching</p>
              </div>
              <div className="absolute -bottom-6 -right-6 bg-white rounded-2xl shadow-xl p-4 max-w-xs">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                    <span className="text-2xl">🚀</span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">98% Success Rate</p>
                    <p className="text-xs text-gray-500">Based on user satisfaction</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
