"use client";

import { useState } from "react";
import {
  HelpCircle,
  Search,
  ChevronDown,
  ChevronUp,
  MessageCircle,
  Mail,
  BookOpen,
  Shield,
  CreditCard,
  User,
  Briefcase,
  FileText,
} from "lucide-react";

interface FAQItem {
  question: string;
  answer: string;
}

interface FAQCategory {
  id: string;
  title: string;
  icon: React.ElementType;
  items: FAQItem[];
}

const faqData: FAQCategory[] = [
  {
    id: "getting-started",
    title: "Getting Started",
    icon: BookOpen,
    items: [
      {
        question: "How do I create an account?",
        answer: "Click the Sign Up button on the homepage, fill in your email and password, then verify your email address. You can also sign up using Google or LinkedIn for faster access.",
      },
      {
        question: "Is the platform free to use?",
        answer: "Yes! Job seekers can use all features for free. Employers have a free tier with limited job postings, and premium plans for unlimited access.",
      },
      {
        question: "Can I use the platform on mobile?",
        answer: "Absolutely. Our platform is fully responsive and works great on all devices including smartphones and tablets.",
      },
    ],
  },
  {
    id: "job-seekers",
    title: "For Job Seekers",
    icon: User,
    items: [
      {
        question: "How do I apply for a job?",
        answer: "Browse jobs, click on any listing that interests you, review the details, and click Apply. You can upload your resume and write a cover letter directly on the platform.",
      },
      {
        question: "Can I save jobs to apply later?",
        answer: "Yes! Click the bookmark icon on any job listing to save it to your favorites. You can view all saved jobs in your dashboard.",
      },
      {
        question: "How will I know if an employer viewed my application?",
        answer: "You will receive an email notification and see a status update in your dashboard when your application is viewed or updated.",
      },
    ],
  },
  {
    id: "employers",
    title: "For Employers",
    icon: Briefcase,
    items: [
      {
        question: "How do I post a job?",
        answer: "Go to your dashboard, click Post a Job, fill in the job details, select a pricing plan, and publish. Your job will be live immediately.",
      },
      {
        question: "What payment methods are accepted?",
        answer: "We accept PayPal and major credit cards. Crypto payments will be available soon.",
      },
      {
        question: "Can I edit a job after posting?",
        answer: "Yes, you can edit, pause, or delete any job posting from your employer dashboard at any time.",
      },
    ],
  },
  {
    id: "billing",
    title: "Billing & Payments",
    icon: CreditCard,
    items: [
      {
        question: "How do I upgrade my plan?",
        answer: "Go to Pricing page, select the plan that fits your needs, and complete the checkout process. Your account will be upgraded instantly.",
      },
      {
        question: "Can I get a refund?",
        answer: "We offer a 7-day money-back guarantee for all paid plans. Contact support within 7 days of purchase for a full refund.",
      },
      {
        question: "Is my payment information secure?",
        answer: "Yes, all payments are processed through secure, encrypted channels. We never store your card details on our servers.",
      },
    ],
  },
  {
    id: "privacy",
    title: "Privacy & Security",
    icon: Shield,
    items: [
      {
        question: "Is my data safe?",
        answer: "We use industry-standard encryption and security practices to protect your data. Read our Privacy Policy for full details.",
      },
      {
        question: "Can I delete my account?",
        answer: "Yes, go to Settings > Account and click Delete Account. All your data will be permanently removed within 30 days.",
      },
      {
        question: "Who can see my profile?",
        answer: "Your profile is visible to employers only when you apply for a job. You can set your profile to private in settings.",
      },
    ],
  },
  {
    id: "account",
    title: "Account Issues",
    icon: FileText,
    items: [
      {
        question: "I forgot my password. What should I do?",
        answer: "Click Forgot Password on the login page, enter your email, and follow the reset link sent to your inbox.",
      },
      {
        question: "How do I change my email address?",
        answer: "Go to Settings > Profile, update your email, and verify the new address via the confirmation email.",
      },
      {
        question: "My account is locked. How do I unlock it?",
        answer: "After too many failed login attempts, your account is temporarily locked. Wait 30 minutes or contact support for immediate help.",
      },
    ],
  },
];

export default function HelpCenterPage() {
  const [search, setSearch] = useState("");
  const [openCategory, setOpenCategory] = useState<string | null>("getting-started");
  const [openQuestion, setOpenQuestion] = useState<string | null>(null);

  const filteredCategories = faqData.map((cat) => ({
    ...cat,
    items: cat.items.filter(
      (item) =>
        item.question.toLowerCase().includes(search.toLowerCase()) ||
        item.answer.toLowerCase().includes(search.toLowerCase())
    ),
  })).filter((cat) => cat.items.length > 0);

  const toggleCategory = (id: string) => {
    setOpenCategory(openCategory === id ? null : id);
  };

  const toggleQuestion = (q: string) => {
    setOpenQuestion(openQuestion === q ? null : q);
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-24 pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/20 mb-4">
            <HelpCircle className="w-7 h-7 text-cyan-400" />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">Help Center</h1>
          <p className="text-slate-400 text-sm">Find answers to your questions</p>
        </div>

        {/* Search */}
        <div className="glass rounded-2xl p-4 mb-8">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search for answers..."
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white text-sm outline-none focus:border-cyan-500/50 transition-all placeholder:text-slate-500"
            />
          </div>
        </div>

        {/* Contact Banner */}
        <div className="glass rounded-2xl p-5 mb-8 flex flex-col sm:flex-row items-center justify-between gap-4 border border-cyan-500/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center">
              <MessageCircle className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <p className="text-white text-sm font-medium">Still need help?</p>
              <p className="text-slate-400 text-xs">Our support team is here for you</p>
            </div>
          </div>
          <a
            href="/contact"
            className="flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white px-5 py-2 rounded-xl text-sm font-medium transition-all"
          >
            <Mail className="w-4 h-4" />
            Contact Support
          </a>
        </div>

        {/* FAQ Categories */}
        <div className="space-y-3">
          {filteredCategories.map((cat) => {
            const Icon = cat.icon;
            const isOpen = openCategory === cat.id;
            return (
              <div key={cat.id} className="glass rounded-2xl overflow-hidden">
                <button
                  onClick={() => toggleCategory(cat.id)}
                  className="w-full flex items-center justify-between p-5 text-left hover:bg-white/[0.02] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center">
                      <Icon className="w-4 h-4 text-cyan-400" />
                    </div>
                    <span className="text-white font-medium text-sm">{cat.title}</span>
                  </div>
                  {isOpen ? (
                    <ChevronUp className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  )}
                </button>

                {isOpen && (
                  <div className="px-5 pb-5 space-y-2">
                    {cat.items.map((item, idx) => {
                      const qKey = `${cat.id}-${idx}`;
                      const isQOpen = openQuestion === qKey;
                      return (
                        <div
                          key={idx}
                          className="rounded-xl bg-white/5 border border-white/5 overflow-hidden"
                        >
                          <button
                            onClick={() => toggleQuestion(qKey)}
                            className="w-full flex items-center justify-between p-4 text-left hover:bg-white/[0.02] transition-colors"
                          >
                            <span className="text-white text-sm font-medium pr-4">{item.question}</span>
                            {isQOpen ? (
                              <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                            )}
                          </button>
                          {isQOpen && (
                            <div className="px-4 pb-4">
                              <p className="text-slate-400 text-sm leading-relaxed">{item.answer}</p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {filteredCategories.length === 0 && (
          <div className="text-center py-12">
            <Search className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">No results found for your search.</p>
            <p className="text-slate-600 text-xs mt-1">Try different keywords.</p>
          </div>
        )}
      </div>
    </main>
  );
}
