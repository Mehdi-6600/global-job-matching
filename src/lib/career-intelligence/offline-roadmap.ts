/**
 * Profile-aware offline 90-day roadmap — target-oriented when targetRole exists.
 */

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
    "System design and architecture practice",
    "One real delivery project with measurable outcome",
    "Code review feedback from a senior engineer",
  ],
  data: [
    "Experiment design and data storytelling resources",
    "Analytical project on real data",
    "Feedback from a senior analyst",
  ],
  design: [
    "UX research and design-system resources",
    "Redesign one real user flow",
    "Critique with a senior designer",
  ],
  education: [
    "Learning design and assessment resources",
    "One differentiated lesson in practice",
    "Feedback from an experienced teacher",
  ],
  healthcare: [
    "Protocol and documentation quality resources",
    "Structured clinical documentation practice",
    "Feedback from a senior clinical peer",
  ],
  accounting_finance: [
    "Reporting automation and controls resources",
    "Automate one real reporting workflow",
    "Feedback from a senior finance peer",
  ],
  trades: [
    "Safety and specialty certification updates",
    "Document one full diagnostic case",
    "Mentorship from an experienced tradesperson",
  ],
  operations_clerical: [
    "Process and no-code automation resources",
    "Improve one repetitive workflow",
    "Feedback from an operations lead",
  ],
  sales_marketing: [
    "Consultative selling resources",
    "One measurable pipeline experiment",
    "Feedback from a senior commercial peer",
  ],
  management: [
    "Coaching and prioritization frameworks",
    "One structured coaching conversation",
    "Feedback from a leadership mentor",
  ],
  generic: [
    "Role-family learning resources",
    "Hands-on project on real work",
    "Peer or mentor feedback",
  ],
};

const FAMILY_RESOURCES_FA: Record<RoleFamily, string[]> = {
  software_engineering: [
    "تمرین طراحی سیستم و معماری",
    "یک پروژه تحویل واقعی با نتیجه قابل اندازه‌گیری",
    "بازخورد کد از مهندس ارشد",
  ],
  data: [
    "منابع طراحی آزمایش و روایت داده",
    "پروژه تحلیلی روی داده واقعی",
    "بازخورد از تحلیلگر ارشد",
  ],
  design: [
    "منابع پژوهش UX و سیستم طراحی",
    "بازطراحی یک جریان واقعی کاربر",
    "نقد با طراح ارشد",
  ],
  education: [
    "منابع طراحی یادگیری و سنجش",
    "یک درس متمایز در عمل",
    "بازخورد از معلم باتجربه",
  ],
  healthcare: [
    "منابع پروتکل و کیفیت مستندسازی",
    "تمرین مستندسازی بالینی ساخت‌یافته",
    "بازخورد از همکار بالینی ارشد",
  ],
  accounting_finance: [
    "منابع اتوماسیون گزارش و کنترل‌ها",
    "اتوماسیون یک جریان گزارش واقعی",
    "بازخورد از همکار مالی ارشد",
  ],
  trades: [
    "به‌روزرسانی ایمنی و گواهی تخصصی",
    "مستندسازی یک عیب‌یابی کامل",
    "منتورشیپ از فرد باتجربه",
  ],
  operations_clerical: [
    "منابع فرایند و اتوماسیون بدون‌کد",
    "بهبود یک جریان تکراری",
    "بازخورد از مسئول عملیات",
  ],
  sales_marketing: [
    "منابع فروش مشاوره‌ای",
    "یک آزمایش قیف قابل اندازه‌گیری",
    "بازخورد از همکار تجاری ارشد",
  ],
  management: [
    "چارچوب‌های کوچینگ و اولویت‌بندی",
    "یک گفت‌وگوی کوچینگ ساخت‌یافته",
    "بازخورد از منتور رهبری",
  ],
  generic: [
    "منابع خانواده شغلی",
    "پروژه عملی روی کار واقعی",
    "بازخورد همکار یا منتور",
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

  const target = profile.targetRole;
  const title = target
    ? fa
      ? `نقشه راه ۹۰روزه: از «${profile.currentRole}» به «${target}»`
      : `90-day roadmap: «${profile.currentRole}» → «${target}»`
    : fa
      ? `نقشه راه ۹۰روزه برای «${profile.currentRole}» (هدف شغلی مشخص نشده)`
      : `90-day roadmap for «${profile.currentRole}» (no target role provided)`;

  const y = profile.yearsExperience;
  const paceNote =
    y != null && y < 3
      ? fa
        ? "با توجه به سابقه کمتر از ۳ سال، حجم یادگیری را واقع‌بینانه نگه دارید."
        : "With under 3 years’ experience, keep learning volume realistic."
      : y != null && y >= 10
        ? fa
          ? "با سابقه بالا، روی رهبری دامنه و انتقال دانش تمرکز کنید نه فقط ابزار جدید."
          : "With substantial tenure, prioritize domain leadership and knowledge transfer—not only new tools."
        : null;

  const resources = fa
    ? FAMILY_RESOURCES_FA[profile.targetRoleFamily || profile.roleFamily] ||
      FAMILY_RESOURCES_FA.generic
    : FAMILY_RESOURCES_EN[profile.targetRoleFamily || profile.roleFamily] ||
      FAMILY_RESOURCES_EN.generic;

  return {
    title,
    weeks: [
      {
        week: fa ? "روزهای ۱–۳۰" : "Days 1–30",
        focus: target
          ? fa
            ? `شکاف به سمت «${target}»: ${g1}`
            : `Gap toward «${target}»: ${g1}`
          : fa
            ? `پایه مقاوم‌سازی: ${g1}`
            : `Resilience foundation: ${g1}`,
        actions: [
          target
            ? fa
              ? `شایستگی‌های «${target}» را در برابر نقش فعلی «${profile.currentRole}» در یک صفحه فهرست کنید`
              : `One-pager: competencies for «${target}» vs current «${profile.currentRole}»`
            : fa
              ? `شکاف «${g1}» را نسبت به نقش «${profile.currentRole}» بنویسید`
              : `Map gap «${g1}» against role «${profile.currentRole}»`,
          fa
            ? `برای وظیفه پرریسک «${exposeLabel}» معیار قبل/بعد تعریف کنید`
            : `Baseline metrics for high-exposure task «${exposeLabel}»`,
          fa
            ? `هفته‌ای ۳ جلسه تمرین متمرکز روی ${g1}`
            : `3 focused practice sessions per week on ${g1}`,
          ...(paceNote ? [paceNote] : []),
        ],
      },
      {
        week: fa ? "روزهای ۳۱–۶۰" : "Days 31–60",
        focus: fa ? `کاربردی‌سازی: ${g2}` : `Apply: ${g2}`,
        actions: [
          fa
            ? `یک جریان‌کار که بخشی از «${exposeLabel}» را نیمه‌خودکار کند بسازید`
            : `Ship a workflow that partially automates «${exposeLabel}»`,
          target
            ? fa
              ? `یک نمونه‌کار که نشان دهد به «${target}» نزدیک می‌شوید ارائه دهید`
              : `Portfolio piece that evidences progress toward «${target}»`
            : fa
              ? `مهارت ${g2} را روی کار واقعی اعمال کنید`
              : `Apply ${g2} on real work artifacts`,
          profile.skills[0]
            ? fa
              ? `مهارت فعلی «${profile.skills[0]}» را با ${g2} ترکیب کنید`
              : `Combine existing «${profile.skills[0]}» with ${g2}`
            : fa
              ? `یک بهبود فرایند قبل/بعد مستند کنید`
              : `Document a before/after process improvement`,
        ],
      },
      {
        week: fa ? "روزهای ۶۱–۹۰" : "Days 61–90",
        focus: fa ? `بازار کار و ${g3}` : `Market readiness and ${g3}`,
        actions: [
          target
            ? fa
              ? `رزومه را برای عنوان «${target}» با نتایج «${exposeLabel}» بازنویسی کنید`
              : `Rewrite resume for title «${target}» using outcomes on «${exposeLabel}»`
            : fa
              ? `رزومه را حول نتایج «${exposeLabel}» و ${gaps.slice(0, 2).join(" و ")} به‌روز کنید`
              : `Update resume around «${exposeLabel}» and ${gaps.slice(0, 2).join(", ")}`,
          fa
            ? `۳ موقعیت هم‌تراز با ${profile.targetRoleFamily || profile.roleFamily} هدف بگیرید`
            : `Target 3 roles aligned with ${profile.targetRoleFamily || profile.roleFamily}`,
          fa
            ? `داستان مصاحبه: مشکل → ${g1}/${g2} → نتیجه`
            : `Interview story: problem → ${g1}/${g2} → result`,
        ],
      },
    ],
    resources,
    source: "heuristic",
  };
}
