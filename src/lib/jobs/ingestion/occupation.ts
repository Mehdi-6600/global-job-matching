/**
 * Deterministic occupation hints from title — not tech-biased.
 */

export type OccupationHint = {
  occupation: string | null;
  occupationFamily: string | null;
  seniority: string | null;
};

const RULES: Array<{
  family: string;
  occupation: string;
  patterns: RegExp[];
}> = [
  {
    family: "healthcare",
    occupation: "nurse",
    patterns: [/\bnurse\b/i, /\brn\b/i, /پرستار/i],
  },
  {
    family: "healthcare",
    occupation: "physician",
    patterns: [/\bdoctor\b/i, /\bphysician\b/i, /\bmd\b/i],
  },
  {
    family: "trades",
    occupation: "electrician",
    patterns: [/electric/i, /برق/i],
  },
  {
    family: "trades",
    occupation: "plumber",
    patterns: [/plumb/i, /لوله‌کش/i],
  },
  {
    family: "trades",
    occupation: "welder",
    patterns: [/weld/i],
  },
  {
    family: "trades",
    occupation: "mechanic",
    patterns: [/mechanic/i, /مکانیک/i],
  },
  {
    family: "hospitality",
    occupation: "chef",
    patterns: [/\bchef\b/i, /\bcook\b/i, /آشپز/i],
  },
  {
    family: "hospitality",
    occupation: "waiter",
    patterns: [/waiter|waitress|server/i, /گارسون/i],
  },
  {
    family: "retail",
    occupation: "cashier",
    patterns: [/cashier/i, /صندوقدار/i],
  },
  {
    family: "logistics",
    occupation: "warehouse_worker",
    patterns: [/warehouse|picker|packer/i, /انبار/i],
  },
  {
    family: "cleaning",
    occupation: "cleaner",
    patterns: [/clean(er|ing)?/i, /نظافت/i],
  },
  {
    family: "education",
    occupation: "teacher",
    patterns: [/teacher|instructor|tutor/i, /معلم/i],
  },
  {
    family: "finance",
    occupation: "accountant",
    patterns: [/account(ant|ing)/i, /حسابدار/i],
  },
  {
    family: "legal",
    occupation: "lawyer",
    patterns: [/lawyer|attorney|counsel/i, /وکیل/i],
  },
  {
    family: "construction",
    occupation: "construction_worker",
    patterns: [/construction|carpenter|mason/i, /ساختمان/i],
  },
  {
    family: "software",
    occupation: "software_engineer",
    patterns: [
      /software engineer|developer|frontend|backend|full.?stack/i,
      /برنامه‌نویس|توسعه‌دهنده/i,
    ],
  },
  {
    family: "management",
    occupation: "manager",
    patterns: [/\bmanager\b|\bdirector\b|\bvp\b|\bcto\b|\bcfo\b|\bceo\b/i],
  },
];

export function inferOccupation(title: string): OccupationHint {
  const t = title || "";
  let seniority: string | null = null;
  if (/\bintern\b|junior|jr\./i.test(t)) seniority = "junior";
  else if (/\bsenior\b|\bsr\./i.test(t)) seniority = "senior";
  else if (/principal|staff|lead/i.test(t)) seniority = "lead";
  else if (/director|vp|head of|c[tefo]o/i.test(t)) seniority = "executive";

  for (const rule of RULES) {
    if (rule.patterns.some((p) => p.test(t))) {
      return {
        occupation: rule.occupation,
        occupationFamily: rule.family,
        seniority,
      };
    }
  }
  return { occupation: null, occupationFamily: null, seniority };
}
