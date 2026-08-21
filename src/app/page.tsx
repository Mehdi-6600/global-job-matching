import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, Globe, Zap, Shield } from "lucide-react";

export default function HomePage() {
  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="relative pt-32 pb-20 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/5 via-transparent to-transparent pointer-events-none" />
        <div className="container mx-auto max-w-4xl text-center relative">
          <div className="inline-flex items-center gap-2 glass px-4 py-1.5 rounded-full text-sm text-cyan-400 mb-8 animate-fade-in-up">
            <Zap className="h-4 w-4" />
            <span>AI-Powered Global Job Matching</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 animate-fade-in-up delay-100">
            Find Your Next Job
            <span className="block neon-text">Anywhere on Earth</span>
          </h1>
          <p className="text-lg md:text-xl text-white/60 max-w-2xl mx-auto mb-10 animate-fade-in-up delay-200">
            We aggregate listings from top job boards worldwide, verify employers,
            and use AI to match you with the perfect opportunity.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in-up delay-300">
            <Link href="/jobs">
              <Button size="lg" className="btn-primary px-8 py-6 text-lg hover-lift">
                Browse Jobs <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link href="/register">
              <Button size="lg" variant="outline" className="btn-outline px-8 py-6 text-lg hover-lift">
                Get Started Free
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-12 px-4">
        <div className="container mx-auto max-w-4xl">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { value: "50K+", label: "Active Jobs" },
              { value: "120+", label: "Countries" },
              { value: "10K+", label: "Employers" },
              { value: "98%", label: "Match Rate" },
            ].map((stat, index) => (
              <div
                key={stat.label}
                className="glass glass-hover p-6 text-center animate-fade-in-up"
                style={{ animationDelay: `${(index + 1) * 100}ms` }}
              >
                <div className="text-2xl md:text-3xl font-bold neon-text">{stat.value}</div>
                <div className="text-sm text-white/50 mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-5xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 animate-fade-in-up">
              Why Global Job Matching?
            </h2>
            <p className="text-white/50 max-w-xl mx-auto animate-fade-in-up delay-100">
              Everything you need to find your dream job or hire top talent, powered by cutting-edge AI.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: Globe,
                title: "Global Reach",
                desc: "Access job listings from 120+ countries and top platforms like Arbeitnow, RemoteOK, and USAJobs.",
              },
              {
                icon: Zap,
                title: "AI Matching",
                desc: "Our intelligent algorithm matches your skills and preferences with the most relevant opportunities.",
              },
              {
                icon: Shield,
                title: "Verified Employers",
                desc: "Every employer is verified. No scams, no fake listings — just real opportunities.",
              },
            ].map((feature, index) => (
              <div
                key={feature.title}
                className="glass glass-hover p-8 animate-fade-in-up hover-glow"
                style={{ animationDelay: `${(index + 1) * 150}ms` }}
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-600/20 flex items-center justify-center mb-5 animate-float">
                  <feature.icon className="h-6 w-6 text-cyan-400" />
                </div>
                <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
                <p className="text-white/50 text-sm leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-3xl">
          <div className="glass-strong neon-border p-10 md:p-14 text-center animate-fade-in-scale hover-glow">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to find your next job?</h2>
            <p className="text-white/50 mb-8 max-w-lg mx-auto">
              Join thousands of professionals who found their dream roles through Global Job Matching.
            </p>
            <Link href="/register">
              <Button size="lg" className="btn-primary px-8 py-6 text-lg hover-lift">
                Create Free Account <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
