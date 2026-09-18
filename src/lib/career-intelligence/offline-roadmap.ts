/**
 * Profile-aware offline 90-day roadmap.
 * Driven by CareerProfile skill gaps + high-automation tasks.
 */

import type { CareerRiskLocale } from "@/types/career-risk";
import { normalizeCareerLocale } from "@/lib/career-risk";
import {
  buildCareerProfile,
  highAutomationTasks,
  taskLabel,
  type ProfileInput,
  type RoleFamily,
} from "@/lib/career-intelligence/profile";

export type OfflineRoadmap = {
  title: string;
  weeks: Array<{ week: string; focus: string; actions: string[] }>;
  resources: string[];
  source: "heuristic";
};

const FAMILY_RESOURCES_EN: Record<RoleFamily, string[]> = {
  software_engineering: [
    "Deep software engineering resources (system design, architecture, testing)",
    "Contribute to one real open-source or work project",
    "Code review feedback from a senior engineer",
  ],
  data: [
    "Data resources (modeling, experimentation, storytelling)",
    "Analytical project on real organizational data",
    "Feedback from a senior analyst or data scientist",
  ],
  design: [
    "Product design and user research resources",
    "Redesign one real flow in Figma",
    "Critique session with a senior designer or UX mentor",
  ],
  education: [
    "Teaching and learning-design resources",
    "Run one differentiated lesson in a real classroom",
    "Feedback from an experienced teacher or coach",
  ],
  healthcare: [
    "Clinical resources and current protocols",
    "High-quality clinical documentation practice",
    "Feedback from a senior clinical colleague",
  ],
  accounting_finance: [
    "Finance/accounting practice resources (reporting, controls)",
    "Automate one real reporting workflow",
    "Feedback from a senior accountant or FP&A mentor",
  ],
  trades: [
    "Trade-specific safety and code updates",
    "Document one diagnostic case end-to-end",
    "Mentorship from an experienced tradesperson",
  ],
  operations_clerical: [
    "Process and no-code automation resources",
    "Improve one repetitive office workflow",
    "Feedback from an operations lead",
  ],
  sales_marketing: [
    "Consultative selling / marketing resources",
    "Run one measurable campaign or pipeline experiment",
    "Feedback from a senior commercial peer",
  ],
  management: [
    "People-leadership and prioritization resources",
    "Practice one coaching conversation with structure",
    "Feedback from a trusted leadership mentor",
  ],
  generic: [
    "Role-family learning resources",
    "Hands-on project on real work artifacts",
    "Feedback from one peer or mentor in the same field",
  ],
};

const FAMILY_RESOURCES_FA: Record<RoleFamily, string[]> = {
  software_engineering: [
    "منابع عمیق مهندسی نرم‌افزار (طراحی سیستم، معماری، تست)",
    "مشارکت در یک پروژه open-source یا کاری واقعی",
    "بازخورد کد از یک مهندس ارشد",
  ],
  data: [
    "منابع تخصصی داده (مدل‌سازی، آزمایش، روایت داده)",
    "پروژه تحلیلی روی داده واقعی سازمانی",
    "بازخورد از یک تحلیلگر ارشد یا دانشمند داده",
  ],
  design: [
    "منابع طراحی محصول و پژوهش کاربر",
    "بازطراحی یک جریان واقعی در Figma",
    "نقد طرح از یک طراح ارشد یا منتور UX",
  ],
  education: [
    "منابع آموزش و طراحی یادگیری",
    "اجرای یک طرح درس متمایز در کلاس واقعی",
    "بازخورد از یک معلم باتجربه یا مربی آموزشی",
  ],
  healthcare: [
    "منابع بالینی و پروتکل‌های به‌روز",
    "تمرین مستندسازی بالینی با کیفیت",
    "بازخورد از یک همکار بالینی ارشد",
  ],
  accounting_finance: [
    "منابع مالی/حسابداری (گزارش‌گری، کنترل‌ها)",
    "اتوماسیون یک جریان گزارش‌دهی واقعی",
    "بازخورد از حسابدار ارشد یا منتور FP&A",
  ],
  trades: [
    "به‌روزرسانی ایمنی و مقررات تخصصی",
    "مستندسازی یک مورد عیب‌یابی از ابتدا تا انتها",
    "منتورشیپ از فرد باتجربه هم‌حرفه",
  ],
  operations_clerical: [
    "منابع فرایند و اتوماسیون بدون‌کد",
    "بهبود یک جریان تکراری اداری",
    "بازخورد از مسئول عملیات",
  ],
  sales_marketing: [
    "منابع فروش مشاوره‌ای / بازاریابی",
    "اجرای یک کمپین یا آزمایش قیف قابل اندازه‌گیری",
    "بازخورد از همکار ارشد تجاری",
  ],
  management: [
    "منابع رهبری افراد و اولویت‌بندی",
    "تمرین یک گفت‌وگوی کوچینگ ساخت‌یافته",
    "بازخورد از منتور رهبری مورد اعتماد",
  ],
  generic: [
    "منابع مرتبط با خانواده شغلی",
    "پروژه عملی روی کار واقعی",
    "بازخورد از یک همکار یا منتور هم‌حوزه",
  ],
};

export function buildOfflineRoadmap(
  input: ProfileInput & { skillsToBuild?: string[] }
): OfflineRoadmap {
  const locale = normalizeCareerLocale(input.locale);
  const profile = buildCareerProfile(input);
  const fa = locale === "fa";
  const exposed = highAutomationTasks(profile);
  const gaps =
    input.skillsToBuild && input.skillsToBuild.length > 0
      ? input.skillsToBuild.slice(0, 6)
      : profile.missingSkills.slice(0, 6);
  const g1 = gaps[0] || (fa ? "مهارت تخصصی مکمل" : "adjacent specialist skill");
  const g2 = gaps[1] || (fa ? "اتوماسیون جریان‌کار" : "workflow automation");
  const g3 = gaps[2] || (fa ? "مستندسازی نتایج" : "outcome documentation");
  const exposeLabel = exposed[0]
    ? taskLabel(exposed[0], locale)
    : fa
      ? "وظایف تکراری"
      : "repetitive tasks";

  const title = fa
    ? `نقشه راه ۹۰روزه برای ${profile.currentRole}`
    : `90-day roadmap for ${profile.currentRole}`;

  const resources = fa
    ? FAMILY_RESOURCES_FA[profile.roleFamily] || FAMILY_RESOURCES_FA.generic
    : FAMILY_RESOURCES_EN[profile.roleFamily] || FAMILY_RESOURCES_EN.generic;

  return {
    title,
    weeks: [
      {
        week: fa ? "روزهای ۱–۳۰" : "Days 1–30",
        focus: fa ? `پایه: ${g1}` : `Foundation: ${g1}`,
        actions: [
          fa
            ? `شکاف «${g1}» را نسبت به نقش فعلی «${profile.currentRole}» در یک صفحه بنویسید`
            : `Write a one-pager mapping gap «${g1}» to your current role «${profile.currentRole}»`,
          fa
            ? `برای وظیفه پرریسک «${exposeLabel}» یک نمونه قبل/بعد اندازه‌گیری کنید`
            : `Baseline metrics for high-exposure task «${exposeLabel}» (time/errors)`,
          fa
            ? `۲ منبع آموزشی مشخص برای ${g1} انتخاب و هفته‌ای ۳ جلسه تمرین کنید`
            : `Pick 2 concrete learning resources for ${g1}; practice 3 sessions/week`,
        ],
      },
      {
        week: fa ? "روزهای ۳۱–۶۰" : "Days 31–60",
        focus: fa ? `کاربردی‌سازی: ${g2}` : `Apply: ${g2}`,
        actions: [
          fa
            ? `یک جریان‌کار کوچک بسازید که بخشی از «${exposeLabel}» را نیمه‌خودکار کند`
            : `Ship a small workflow that partially automates «${exposeLabel}»`,
          fa
            ? `مهارت ${g2} را روی داده یا پروژه واقعی خودتان اعمال کنید (نه فقط دوره)`
            : `Apply ${g2} on your real work artifacts — not only a course`,
          profile.skills[0]
            ? fa
              ? `مهارت فعلی «${profile.skills[0]}» را با ${g2} ترکیب و در نمونه‌کار نشان دهید`
              : `Combine existing skill «${profile.skills[0]}» with ${g2} in a portfolio piece`
            : fa
              ? `یک نمونه‌کار کوتاه از بهبود فرآیند تهیه کنید`
              : `Produce a short before/after process improvement artifact`,
        ],
      },
      {
        week: fa ? "روزهای ۶۱–۹۰" : "Days 61–90",
        focus: fa ? `بازار کار و ${g3}` : `Market readiness and ${g3}`,
        actions: [
          fa
            ? `رزومه را حول نتایج «${exposeLabel}» و مهارت‌های ${gaps.slice(0, 2).join(" و ")} بازنویسی کنید`
            : `Rewrite resume bullets around outcomes on «${exposeLabel}» and ${gaps.slice(0, 2).join(", ")}`,
          fa
            ? `۳ موقعیت هم‌تراز با خانواده شغلی ${profile.roleFamily} را هدف بگیرید`
            : `Target 3 roles aligned with family «${profile.roleFamily}»`,
          fa
            ? `داستان مصاحبه: مشکل → اقدام روی ${g1}/${g2} → نتیجه`
            : `Interview story: problem → action on ${g1}/${g2} → measurable result`,
        ],
      },
    ],
    resources,
    source: "heuristic",
  };
}
