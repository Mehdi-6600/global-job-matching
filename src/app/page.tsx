import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Play, ChevronRight } from "lucide-react";

export default function HomePage() {
  return (
    <div className="pt-16"> {/* برای جبران ارتفاع هدر fixed */}
      {/* بخش Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-white to-indigo-50">
        <div className="container mx-auto px-4 py-24 md:py-32">
          <div className="max-w-4xl mx-auto text-center">
            {/* نشانگر */}
            <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 px-4 py-1.5 rounded-full text-sm font-medium mb-6">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-600"></span>
              </span>
              AI-Powered Job Matching
            </div>

            {/* عنوان */}
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight text-gray-900 mb-6">
              Find Your{' '}
              <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Dream Job
              </span>
              {' '}Anywhere
            </h1>

            {/* توضیحات */}
            <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto mb-10 leading-relaxed">
              Global job matching powered by AI. Discover opportunities tailored to your skills and preferences — completely free to start.
            </p>

            {/* دکمه‌ها */}
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

            {/* آمار */}
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

      {/* بخش مشتریان (برندها) */}
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
    </div>
  );
}
