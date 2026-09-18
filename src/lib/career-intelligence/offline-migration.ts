/**
 * Profile-aware offline migration suggestions.
 * Career-fit only — does NOT invent visa law, quotas, or current eligibility.
 */

import type { CareerRiskLocale } from "@/types/career-risk";
import { normalizeCareerLocale } from "@/lib/career-risk";
import {
  buildCareerProfile,
  type ProfileInput,
  type RoleFamily,
} from "@/lib/career-intelligence/profile";

export type MigrationCountry = {
  country: string;
  demand: string;
  pathway: string;
  notes: string;
};

export type OfflineMigration = {
  title: string;
  summary: string;
  countries: MigrationCountry[];
  source: "heuristic";
};

type DestinationHint = {
  country: string;
  angle: string;
};

const FAMILY_DESTINATIONS: Record<RoleFamily, DestinationHint[]> = {
  software_engineering: [
    {
      country: "Germany",
      angle:
        "engineering / EU Blue Card style skilled pathways (verify current rules)",
    },
    {
      country: "Canada",
      angle: "skilled tech employment routes (verify NOC/program fit)",
    },
    {
      country: "Netherlands",
      angle: "tech hubs + highly skilled migrant schemes (verify)",
    },
  ],
  data: [
    {
      country: "Germany",
      angle: "analytics/engineering demand in industry (verify)",
    },
    {
      country: "Canada",
      angle: "data roles in skilled categories (verify)",
    },
    {
      country: "UK",
      angle: "digital/data occupations lists change — verify",
    },
  ],
  design: [
    {
      country: "Canada",
      angle: "product/design roles in tech markets (verify)",
    },
    {
      country: "Germany",
      angle: "UX in product companies (verify language needs)",
    },
    {
      country: "Netherlands",
      angle: "design in product/startup ecosystems (verify)",
    },
  ],
  education: [
    {
      country: "Canada",
      angle:
        "education-related work often needs credential assessment (verify)",
    },
    {
      country: "Germany",
      angle: "teaching usually requires recognition + language (verify)",
    },
    {
      country: "UAE",
      angle: "international school markets — contract dependent (verify)",
    },
  ],
  healthcare: [
    {
      country: "Germany",
      angle:
        "regulated health professions — recognition mandatory (verify)",
    },
    {
      country: "Canada",
      angle: "provincial licensing for nursing/health (verify)",
    },
    {
      country: "Australia",
      angle:
        "skilled health lists change — verify AHPRA/ANMAC paths",
    },
  ],
  accounting_finance: [
    {
      country: "UAE",
      angle: "regional finance hubs — employer-led (verify)",
    },
    {
      country: "Canada",
      angle: "accounting designations may need bridging (verify)",
    },
    {
      country: "Germany",
      angle:
        "finance roles often need German + recognition (verify)",
    },
  ],
  trades: [
    {
      country: "Canada",
      angle:
        "trades/skilled worker streams vary by province (verify)",
    },
    {
      country: "Australia",
      angle:
        "trade recognition pathways exist but are specific (verify)",
    },
    {
      country: "Germany",
      angle:
        "vocational recognition (Anerkennung) may apply (verify)",
    },
  ],
  operations_clerical: [
    {
      country: "Canada",
      angle:
        "employer-supported roles; pure clerical harder alone (verify)",
    },
    {
      country: "UAE",
      angle: "employer sponsorship common (verify contract terms)",
    },
    {
      country: "Germany",
      angle:
        "language + scarcity matter more than title alone (verify)",
    },
  ],
  sales_marketing: [
    {
      country: "UAE",
      angle: "commercial roles often employer-led (verify)",
    },
    {
      country: "Canada",
      angle:
        "marketing fit depends on specialization (verify)",
    },
    {
      country: "Netherlands",
      angle: "English-friendly commercial hubs (verify)",
    },
  ],
  management: [
    {
      country: "UAE",
      angle: "managerial packages often employer-driven (verify)",
    },
    {
      country: "Germany",
      angle:
        "leadership roles typically need language + track record (verify)",
    },
    {
      country: "Canada",
      angle: "managerial NOC fit must be checked (verify)",
    },
  ],
  generic: [
    {
      country: "Canada",
      angle:
        "profile-driven skilled assessment required (verify)",
    },
    {
      country: "Germany",
      angle: "skill shortage lists change — verify",
    },
    {
      country: "UAE",
      angle: "employer contract pathways (verify)",
    },
  ],
};

function joinList(items: string[], locale: CareerRiskLocale): string {
  const separator = locale === "fa" ? "، " : ", ";
  return items.filter(Boolean).join(separator);
}

function formatYears(
  years: number | null | undefined,
  locale: CareerRiskLocale
): string {
  if (years == null) {
    return locale === "fa" ? "سابقه نامشخص" : "unspecified tenure";
  }

  return locale === "fa"
    ? `${years} سال تجربه`
    : `${years} years’ experience`;
}

export function buildOfflineMigration(
  input: ProfileInput
): OfflineMigration {
  const locale = normalizeCareerLocale(input.locale);
  const profile = buildCareerProfile(input);
  const isFa = locale === "fa";

  const destinations =
    FAMILY_DESTINATIONS[profile.roleFamily] ??
    FAMILY_DESTINATIONS.generic;

  const skills = profile.skills.slice(0, 4);
  const skillBit =
    skills.length > 0
      ? joinList(skills, locale)
      : isFa
        ? "مهارت‌های اعلام‌نشده"
        : "unspecified skills";

  const yearsBit = formatYears(profile.yearsExperience, locale);

  const title = isFa
    ? `مسیرهای مهاجرتی مرتبط با «${profile.currentRole}»`
    : `Migration-oriented pathways for «${profile.currentRole}»`;

  const roleDescriptor =
    profile.roleFamily +
    (profile.specialization ? ` / ${profile.specialization}` : "");

  const summary = isFa
    ? `بر اساس نقش «${profile.currentRole}» (${roleDescriptor})، ${yearsBit}، و مهارت‌ها (${skillBit}) این مقاصد از نظر تناسب شغلی منطقی‌ترند. ` +
      `این یک ارزیابی تناسب مسیر شغلی است نه رأی حقوقی؛ قوانین ویزا و لیست مشاغل کمبود را از منابع رسمی همان کشور بررسی کنید.`
    : `Based on role «${profile.currentRole}» (${roleDescriptor}), ${yearsBit}, and skills (${skillBit}), these destinations are relatively closer on career-fit grounds. ` +
      `This is occupational-fit guidance only — not legal advice; verify current visa rules and shortage lists with official sources.`;

  const countries: MigrationCountry[] = destinations.map((destination) => {
    const leadSkill = profile.skills[0];
    const edgeSkills = profile.transferableSkills.slice(0, 2);
    const gapSkill = profile.missingSkills[0];

    const demand = isFa
      ? `تناسب محتمل با خانواده شغلی ${profile.roleFamily}` +
        (leadSkill ? ` و مهارت ${leadSkill}` : "")
      : `Likely relevance to ${profile.roleFamily}` +
        (leadSkill ? ` and skill ${leadSkill}` : "");

    const pathway = isFa
      ? `مسیرهای مهارتی/استخدام‌محور مرتبط با ${profile.currentRole} — جزئیات را رسمی چک کنید`
      : `Skilled/employer-led pathways related to ${profile.currentRole} — verify official criteria`;

    const profileEdge =
      edgeSkills.length > 0 ? joinList(edgeSkills, locale) : yearsBit;

    const likelyGap = gapSkill
      ? gapSkill
      : isFa
        ? "زبان/مدارک محلی"
        : "local language/credentials";

    const notes = isFa
      ? `مزیت پروفایل: ${profileEdge}. شکاف محتمل: ${likelyGap}. ${destination.angle}`
      : `Profile edge: ${profileEdge}. Likely gap: ${likelyGap}. ${destination.angle}`;

    return {
      country: destination.country,
      demand,
      pathway,
      notes,
    };
  });

  return {
    title,
    summary,
    countries,
    source: "heuristic",
  };
}
