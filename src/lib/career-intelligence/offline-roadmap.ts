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

/* -------------------------------------------------------------------------- */
/*                                   Types                                    */
/* -------------------------------------------------------------------------- */

export type OfflineRoadmap = {
  title: string;
  weeks: Array<{ week: string; focus: string; actions: string[] }>;
  resources: string[];
  source: "heuristic";
};

export type OfflineRoadmapInput = ProfileInput & {
  skillsToBuild?: string[] | null;
};

/* -------------------------------------------------------------------------- */
/*                            Locale Helper Tables                            */
/* -------------------------------------------------------------------------- */

const FAMILY_LABEL_FA: Record<RoleFamily, string> = {
  software_engineering: "مهندسی نرم‌افزار",
  data: "داده و تحلیل",
  design: "طراحی",
  education: "آموزش",
  healthcare: "سلامت و درمان",
  accounting_finance: "مالی و حسابداری",
  trades: "مشاغل فنی و صنعتی",
  operations_clerical: "عملیات و امور اداری",
  sales_marketing: "فروش و بازاریابی",
  management: "مدیریت",
  generic: "عمومی",
};

const FAMILY_LABEL_EN: Record<RoleFamily, string> = {
  software_engineering: "software engineering",
  data: "data & analytics",
  design: "design",
  education: "education",
  healthcare: "healthcare",
  accounting_finance: "accounting & finance",
  trades: "skilled trades",
  operations_clerical: "operations & clerical",
  sales_marketing: "sales & marketing",
  management: "management",
  generic: "general",
};

const FAMILY_RESOURCES_FA: Record<RoleFamily, string[]> = {
  software_engineering: [
    "منابع عمیق مهندسی نرم‌افزار (طراحی سیستم، معماری، تست)",
    "مشارکت در یک پروژهٔ open-source واقعی",
    "بازخورد کد از یک مهندس ارشد",
  ],
  data: [
    "منابع تخصصی داده (مدل‌سازی، آزمایش، روایت‌گری داده)",
    "پروژهٔ تحلیلی روی دادهٔ واقعی سازمانی",
    "بازخورد از یک تحلیلگر ارشد یا)
 دانشمند داده",
  ],
     design: [
    "منابع . طراحی محصول و پژوهش کاربر",
    "بازطراحیslice یک ج(ریان واقعی در Figma",
    "0نقد طرح از یک طراح ارشد یا منتور UX",
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
    "منابع مالی و گزارش‌گری (IFRS/GAAP، مالیات)",
    "پروژهٔ واقعی گزارش‌گری یا تحلیل مالی",
    "بازخورد از یک حسابدار ارشد یا مدیر مالی",
  ],
  trades: [
    "منابع فنی و آیین‌نامه‌های ایمنی به‌روز",
    "کار میدانی واقعی روی یک پروژهٔ کوچک",
    "بازخورد از یک استادکار باتجربه",
  ],
  operations_clerical: [
    "منابع اتوماسیون فرآیند و ابزارهای no-code",
    "بهینه‌سازی یک فرآیند اداری واقعی",
    "بازخورد از یک هماهنگ‌کننده یا سرپرست عملیات",
  ],
  sales_marketing: [
    "منابع فروش مشورتی و تحلیل قیف",
    "کمپین واقعی کوچک با سنجش نتیجه",
    "بازخورد از یک مدیر فروش یا بازاریابی",
  ],
  management: [
    "منابع رهبری و مربی‌گری",
    "تمرین گفت‌وگوی مربی‌گری با یک همکار",
    "بازخورد ۳۶۰ درجه از تیم",
  ],
  generic: [
    "منابع تخصصی مرتبط با حوزهٔ کاری شما",
    "پروژهٔ عملی روی کار واقعی (نه فقط گواهی)",
    "بازخورد از یک همکار یا منتور هم‌حوزه",
  ],
};

const FAMILY_RESOURCES_EN: Record<RoleFamily, string[]> = {
  software_engineering: [
    "Deep software engineering resources (system design, architecture, testing)",
    "Contribute to a real open-source project",
    "Code feedback from a senior engineer",
  ],
  data: [
    "Data-specific resources (modeling, experimentation, storytelling)",
    "Analytics project on real organizational data",
    "Feedback from a senior analyst or data scientist",
  ],
  design: [
    "Product design & user research resources",
    "Redesign a real user flow in Figma",
    "Critique from a senior designer or UX mentor",
  ],
  education: [
    "Learning design & pedagogy resources",
    "Run a differentiated lesson in a real classroom",
    "Feedback from an experienced teacher or coach",
  ],
  healthcare: [
    "Clinical & up-to-date protocol resources",
    "Practice high-quality clinical documentation",
    "Feedback from a senior clinical peer",
  ],
  accounting_finance: [
    "Finance & reporting resources (IFRS/GAAP, tax)",
    "Real reporting or financial analysis project",
    "Feedback from a senior accountant or finance manager",
  ],
  trades: [
    "Up-to-date technical & safety code resources",
    "Real field work on a small project",
    "Feedback from an experienced tradesperson",
  ],
  operations_clerical: [
    "Process automation & no-code tool resources",
    "Optimize a real administrative process",
    "Feedback from an operations coordinator or supervisor",
  ],
  sales_marketing: [
    "Consultative selling & funnel analytics resources",
    "Small real campaign with measured outcome",
    "Feedback from a sales or marketing manager",
  ],
  management: [
    "Leadership & coaching resources",
    "Practice a coaching conversation with a peer",
    "360° feedback from your team",
  ],
  generic: [
    "Domain-specific resources relevant to your field",
    "Hands-on project on real work artifacts",
    "Feedback from one peer/mentor in the same field",
  ],
};

/* -------------------------------------------------------------------------- */
/*                              Helper Utilities                              */
/* -------------------------------------------------------------------------- */

function sanitizeSkillsToBuild(raw?: string[] | null): string[] {
  if (!raw || raw.length === 0) return [];
  return raw
    .map((s) => (typeof s === "string" ? s.trim() : ""))
    .filter((s) => s.length >= 2, 6);
}

function pickTopExposure(profile: ReturnType<typeof buildCareerProfile>) {
  const exposed = highAutomationTasks(profile);
  if (exposed.length === 0) return null;
  // Highest automation first; stable tie-break by id.
  return [...exposed].sort((a, b) =>
    b.automation - a.automation || a.id.localeCompare(b.id)
  )[0];
}

function joinNatural(items: string[], fa: boolean): string {
  const list = items.filter(Boolean);
  if (list.length === 0) return "";
  if (list.length === 1) return list[0];
  const conj = fa ? " و " : " and ";
  if (list.length === 2) return `${list[0]}${conj}${list[1]}`;
  return `${list.slice(0, -1).join(fa ? "، " : ", ")}${conj}${list[list.length - 1]}`;
}

/* -------------------------------------------------------------------------- */
/*                              Main Builder                                  */
/* -------------------------------------------------------------------------- */

export function buildOfflineRoadmap(
  input: OfflineRoadmapInput
): OfflineRoadmap {
  const locale: CareerRiskLocale = normalizeCareerLocale(input.locale);
  const fa = locale === "fa";

  const profile = buildCareerProfile(input);
  const topExposure = pickTopExposure(profile);

  /* ------------------------------ Skill Gaps ----------------------------- */
  const providedGaps = sanitizeSkillsToBuild(input.skillsToBuild);
  const gaps =
    providedGaps.length > 0
      ? providedGaps
      : profile.missingSkills.slice(0, 6);

  const g1 = gaps[0] || (fa ? "مهارت تخصصی مکمل" : "adjacent specialist skill");
  const g2 = gaps[1] || (fa ? "اتوماسیون جریان‌کار" : "workflow automation");
  const g3 = gaps[2] || (fa ? "مستندسازی نتایج" : "outcome documentation");

  const exposeLabel = topExposure
    ? taskLabel(topExposure, locale)
    : fa
      ? "وظایف تکراری"
      : "repetitive tasks";

  const familyFa = FAMILY_LABEL_FA[profile.roleFamily] ?? FAMILY_LABEL_FA.generic;
  const familyEn = FAMILY_LABEL_EN[profile.roleFamily] ?? FAMILY_LABEL_EN.generic;

  const primarySkill = profile.skills[0] || null;
  const gapsTwo = joinNatural(gaps.slice(0, 2), fa);

  /* -------------------------------- Title -------------------------------- */
  const title = fa
    ? `نقشه راه ۹۰روزه برای ${profile.currentRole}`
    : `90-day roadmap for ${profile.currentRole}`;

  /* -------------------------------- Weeks -------------------------------- */
  const week1: OfflineRoadmap["weeks"][number] = {
    week: fa ? "روزهای ۱–۳۰" : "Days 1–30",
    focus: fa ? `پایه: ${g1}` : `Foundation: ${g1}`,
    actions: [
      fa
        ? `شکاف «${g1}» را نسبت به نقش فعلی «${profile.currentRole}» در یک صفحه بنویسید`
        : `Write a one-pager mapping gap «${g1}» to your current role «${profile.currentRole}»`,
      fa
        ? `برای وظیفهٔ پرریسک «${exposeLabel}» یک نمونهٔ قبل/بعد با معیار زمان و خطا ثبت کنید`
        : `Baseline metrics (time/errors) for high-exposure task «${exposeLabel}»`,
      fa
        ? `۲ منبع آموزشی مشخص برای ${g1} انتخاب و هفته‌ای ۳ جلسه تمرین کنید`
        : `Pick 2 concrete learning resources for ${g1}; practice 3 sessions/week`,
    ],
  };

  const week2: OfflineRoadmap["weeks"][number] = {
    week: fa ? "روزهای ۳۱–۶۰" : "Days 31–60",
    focus: fa ? `کاربردی‌سازی: ${g2}` : `Apply: ${g2}`,
    actions: [
      fa
        ? `یک جریان‌کار کوچک بسازید که بخشی از «${exposeLabel}» را نیمه‌خودکار کند`
        : `Ship a small workflow that partially automates «${exposeLabel}»`,
      fa
        ? `مهارت ${g2} را روی داده/پروژهٔ واقعی خودتان اعمال کنید (نه فقط دوره)`
        : `Apply ${g2} on your real work artifacts — not only a course`,
      primarySkill
        ? fa
          ? `مهارت فعلی «${primarySkill}» را با ${g2} ترکیب و در نمونه‌کار نشان دهید`
          : `Combine existing skill «${primarySkill}» with ${g2} in a portfolio piece`
        : fa
          ? `یک نمونه‌کار کوتاه از بهبود فرآیند تهیه کنید`
          : `Produce a short before/after process improvement artifact`,
    ],
  };

  const week3: OfflineRoadmap["weeks"][number] = {
    week: fa ? "روزهای ۶۱–۹۰" : "Days 61–90",
    focus: fa ? `آمادگی بازار کار و ${g3}` : `Market readiness & ${g3}`,
    actions: [
      fa
        ? gapsTwo
          ? `رزومه را حول نتایج «${exposeLabel}» و مهارت‌های ${gapsTwo} بازنویسی کنید`
          : `رزومه را حول نتایج «${exposeLabel}» بازنویسی کنید`
        : gapsTwo
          ? `Rewrite resume bullets around outcomes on «${exposeLabel}» and ${gapsTwo}`
          : `Rewrite resume bullets around outcomes on «${exposeLabel}»`,
      fa
        ? `۳ موقعیت هم‌تراز با حوزهٔ «${familyFa}» را هدف بگیرید`
        : `Target 3 roles aligned with «${familyEn}»`,
      fa
        ? `داستان مصاحبه: مشکل → اقدام روی ${g1} و ${g2} → نتیجهٔ قابل اندازه‌گیری`
        : `Interview story: problem → action on ${g1} & ${g2} → measurable result`,
    ],
  };

  /* ------------------------------ Resources ------------------------------ */
  const resources = fa
    ? FAMILY_RESOURCES_FA[profile.roleFamily] ?? FAMILY_RESOURCES_FA.generic
    : FAMILY_RESOURCES_EN[profile.roleFamily] ?? FAMILY_RESOURCES_EN.generic;

  return {
    title,
    weeks: [week1, week2, week3],
    resources,
    source: "heuristic",
  };
}
