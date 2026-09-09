"use client";

import { useState } from "react";
import Link from "next/link";
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
  ArrowLeft,
} from "lucide-react";
import { useLocale } from "@/components/locale-provider";

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
        answer:
          "Click Sign Up, enter your email and password, then verify your email. You can also use Google sign-in.",
      },
      {
        question: "Job seeker or employer?",
        answer:
          "Choose your role during registration or update it later in Settings. Employers can post jobs; job seekers can apply and use AI tools.",
      },
    ],
  },
  {
    id: "account",
    title: "Account & Profile",
    icon: User,
    items: [
      {
        question: "How do I reset my password?",
        answer:
          "Use Forgot Password on the login page. We email a secure reset link.",
      },
      {
        question: "How do I delete my account?",
        answer:
          "Go to Settings → Account and request deletion. This removes personal data per our privacy policy.",
      },
    ],
  },
  {
    id: "jobs",
    title: "Jobs & Applications",
    icon: Briefcase,
    items: [
      {
        question: "How do I apply to a job?",
        answer:
          "Open a job detail page and click Apply. Keep your profile and resume up to date for better matches.",
      },
      {
        question: "Why was my job post rejected?",
        answer:
          "Posts must follow quality guidelines. Check email or Notifications for the reason, then edit and resubmit.",
      },
    ],
  },
  {
    id: "billing",
    title: "Plans & Payments",
    icon: CreditCard,
    items: [
      {
        question: "How do crypto payments work?",
        answer:
          "Choose a plan on Pricing, send the exact amount to the shown wallet, then submit the transaction hash. An admin confirms before the plan activates.",
      },
    ],
  },
  {
    id: "security",
    title: "Security",
    icon: Shield,
    items: [
      {
        question: "Is my data safe?",
        answer:
          "We use hashed passwords, session auth, and role-based access. Never share verification links.",
      },
    ],
  },
  {
    id: "content",
    title: "Content",
    icon: FileText,
    items: [
      {
        question: "Where is the blog?",
        answer: "Visit /blog for published articles from the team.",
      },
    ],
  },
];

export default function HelpCenterPage() {
  const { t } = useLocale();
  const [search, setSearch] = useState("");
  const [openCategory, setOpenCategory] = useState<string | null>(
    "getting-started"
  );
  const [openQuestion, setOpenQuestion] = useState<string | null>(null);

  const filteredCategories = faqData
    .map((cat) => ({
      ...cat,
      items: cat.items.filter(
        (item) =>
          item.question.toLowerCase().includes(search.toLowerCase()) ||
          item.answer.toLowerCase().includes(search.toLowerCase())
      ),
    }))
    .filter((cat) => cat.items.length > 0);

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-24 pb-16 px-4">
      <div className="max-w-3xl mx-auto">
        <Link
          href="/admin"
          className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white mb-4"
        >
          <ArrowLeft className="w-4 h-4" /> {t("Common.back", "Back")}
        </Link>

        <div className="text-center mb-10">
          <HelpCircle className="w-12 h-12 text-cyan-400 mx-auto mb-3" />
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">
            {t("Nav.help", "Help Center")}
          </h1>
          <p className="text-slate-400 text-sm">
            {t("Dashboard.welcomeSub", "Answers for admins and operators")}
          </p>
        </div>

        <div className="relative mb-8">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("Common.search", "Search FAQ...")}
            className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder:text-slate-500"
          />
        </div>

        <div className="space-y-4">
          {filteredCategories.map((cat) => {
            const Icon = cat.icon;
            const open = openCategory === cat.id;
            return (
              <div
                key={cat.id}
                className="glass rounded-2xl border border-white/10 overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() =>
                    setOpenCategory(open ? null : cat.id)
                  }
                  className="w-full flex items-center justify-between p-4 text-left"
                >
                  <span className="flex items-center gap-3 text-white font-medium">
                    <Icon className="w-5 h-5 text-cyan-400" />
                    {cat.title}
                  </span>
                  {open ? (
                    <ChevronUp className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  )}
                </button>
                {open && (
                  <div className="px-4 pb-4 space-y-2">
                    {cat.items.map((item) => {
                      const qOpen = openQuestion === item.question;
                      return (
                        <div
                          key={item.question}
                          className="rounded-xl bg-white/5 border border-white/5"
                        >
                          <button
                            type="button"
                            onClick={() =>
                              setOpenQuestion(
                                qOpen ? null : item.question
                              )
                            }
                            className="w-full text-left p-3 text-sm text-slate-200 flex justify-between gap-2"
                          >
                            {item.question}
                            {qOpen ? (
                              <ChevronUp className="w-4 h-4 shrink-0" />
                            ) : (
                              <ChevronDown className="w-4 h-4 shrink-0" />
                            )}
                          </button>
                          {qOpen && (
                            <p className="px-3 pb-3 text-sm text-slate-400 leading-relaxed">
                              {item.answer}
                            </p>
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
          <p className="text-center text-slate-500 text-sm py-8">
            {t("Common.noResults", "No results")}
          </p>
        )}

        <div className="mt-10 glass rounded-2xl p-6 border border-white/10 text-center">
          <MessageCircle className="w-8 h-8 text-cyan-400 mx-auto mb-2" />
          <p className="text-white font-medium mb-1">
            {t("Contact.title", "Still need help?")}
          </p>
          <a
            href="mailto:support@example.com"
            className="inline-flex items-center gap-2 text-cyan-400 text-sm hover:underline"
          >
            <Mail className="w-4 h-4" />
            {t("Contact.email", "Email support")}
          </a>
        </div>
      </div>
    </main>
  );
}
