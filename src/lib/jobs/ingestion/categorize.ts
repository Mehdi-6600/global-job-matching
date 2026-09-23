/**
 * Deterministic job categorizer.
 *
 * Maps a raw job title (and, as a secondary signal, the job's tags)
 * onto one of a small set of canonical category slugs. The slug is the
 * stable identity used everywhere else:
 *
 *   - `Category.slug` in the database
 *   - `?category=` query param on `/api/jobs`
 *   - `categoryLabel(slug, dbName, locale)` for localized display
 *
 * The categorizer is intentionally conservative:
 *   - Only the title is used as the primary signal, since it is the
 *     single most reliable human-curated field.
 *   - Tags are used as a fallback when the title has no strong signal.
 *   - When nothing matches, `null` is returned and the caller must
 *     leave `categoryId` untouched (never invent a category).
 *
 * The list here mirrors `scripts/backfill-categories.mjs` and the
 * label map in `src/lib/i18n/category-labels.ts`. Keep them in sync
 * when adding a new category.
 */

export type CategorySlug =
  | "software-engineering"
  | "engineering"
  | "design"
  | "ux-design"
  | "marketing"
  | "digital-marketing"
  | "sales"
  | "finance"
  | "accounting"
  | "healthcare"
  | "education"
  | "customer-support"
  | "customer-service"
  | "operations"
  | "human-resources"
  | "legal"
  | "data-science"
  | "data-analytics"
  | "artificial-intelligence"
  | "machine-learning"
  | "product-management"
  | "project-management"
  | "quality-assurance"
  | "devops"
  | "it-support"
  | "writing"
  | "content-writing"
  | "translation"
  | "retail"
  | "hospitality"
  | "construction"
  | "manufacturing"
  | "logistics"
  | "admin"
  | "research"
  | "science";

/**
 * Ordered list of (pattern → slug) rules.
 *
 * IMPORTANT: order matters. More specific rules must come before
 * broader ones (e.g. "software-engineering" before "engineering",
 * "ux-design" before "design", "machine-learning" before
 * "artificial-intelligence" is intentionally reversed — see below).
 */
type Rule = { re: RegExp; slug: CategorySlug };

const TITLE_RULES: Rule[] = [
  // --- Tech: most specific first --------------------------------------
  { re: /\b(devops|sre|site\s*reliability|platform\s+engineer)\b/i, slug: "devops" },
  { re: /\b(machine\s*learning|ml\s+engineer|ml\s+scientist|deep\s+learning)\b/i, slug: "machine-learning" },
  { re: /\b(ai|artificial\s+intelligence|llm|nlp|computer\s+vision)\b/i, slug: "artificial-intelligence" },
  { re: /\b(data\s+scien|data\s+scientist|statistician)\b/i, slug: "data-science" },
  { re: /\b(data\s+analyst|analytics\s+engineer|business\s+intelligence|\bbi\b)\b/i, slug: "data-analytics" },
  { re: /\b(qa|quality\s+assurance|test\s+engineer|automation\s+test|selenium|cypress)\b/i, slug: "quality-assurance" },
  { re: /\b(ux|user\s+experience|product\s+designer|interaction\s+design)\b/i, slug: "ux-design" },
  { re: /\b(software\s+engineer|software\s+developer|frontend|front[-\s]?end|backend|back[-\s]?end|full[-\s]?stack|web\s+developer|mobile\s+developer|ios|android|react|node|javascript|typescript|python\s+developer|java\s+developer)\b/i, slug: "software-engineering" },
  { re: /\b(engineer|engineering)\b/i, slug: "engineering" },
  { re: /\b(designer|design|ui)\b/i, slug: "design" },

  // --- Business ------------------------------------------------------
  { re: /\b(digital\s+marketing|seo|sem|performance\s+marketing|growth\s+marketing|paid\s+media)\b/i, slug: "digital-marketing" },
  { re: /\b(marketing|brand\s+manager|brand\s+strategist|market\s+research)\b/i, slug: "marketing" },
  { re: /\b(sales|account\s+executive|account\s+manager|business\s+development|sales\s+rep|sales\s+representative|sdr|bdr)\b/i, slug: "sales" },
  { re: /\b(accountant|accounting|bookkeep|audit|tax\s+specialist)\b/i, slug: "accounting" },
  { re: /\b(finance|financial\s+analyst|fp&a|controller|treasury|cfo)\b/i, slug: "finance" },
  { re: /\b(human\s+resources|hr\s+manager|recruiter|talent\s+acquisition|people\s+operations|\bhr\b)\b/i, slug: "human-resources" },
  { re: /\b(operations\s+manager|operations\s+lead|coo|operations)\b/i, slug: "operations" },
  { re: /\b(project\s+manager|project\s+management|program\s+manager|pmo)\b/i, slug: "project-management" },
  { re: /\b(product\s+manager|product\s+owner|product\s+lead|head\s+of\s+product)\b/i, slug: "product-management" },
  { re: /\b(legal|counsel|attorney|lawyer|paralegal|compliance\s+officer)\b/i, slug: "legal" },

  // --- Healthcare / education ---------------------------------------
  { re: /\b(nurse|nursing|physician|doctor|clinician|therapist|medical|healthcare|pharmacist|dentist|surgeon|health\s+care)\b/i, slug: "healthcare" },
  { re: /\b(teacher|tutor|instructor|professor|lecturer|education|educator|teaching\s+assistant)\b/i, slug: "education" },
  { re: /\b(research\s+scientist|research\s+assistant|researcher|postdoc)\b/i, slug: "research" },
  { re: /\b(scientist|science)\b/i, slug: "science" },

  // --- Support / service ---------------------------------------------
  { re: /\b(customer\s+support|technical\s+support|help\s*desk|support\s+engineer|support\s+specialist)\b/i, slug: "customer-support" },
  { re: /\b(customer\s+service|customer\s+care|call\s+center|client\s+service|service\s+representative)\b/i, slug: "customer-service" },
  { re: /\b(it\s+support|system\s+administrator|sysadmin|network\s+administrator|helpdesk)\b/i, slug: "it-support" },

  // --- Content / writing --------------------------------------------
  { re: /\b(content\s+writer|content\s+creator|content\s+specialist|copywriter|technical\s+writer)\b/i, slug: "content-writing" },
  { re: /\b(writer|writing|editor|proofreader|journalist)\b/i, slug: "writing" },
  { re: /\b(translator|translation|localization|localisation)\b/i, slug: "translation" },

  // --- Trades / physical --------------------------------------------
  { re: /\b(construction|site\s+engineer|civil\s+engineer|foreman|architect)\b/i, slug: "construction" },
  { re: /\b(manufactur|production\s+operator|assembly|machinist|welder|factory)\b/i, slug: "manufacturing" },
  { re: /\b(logistics|supply\s+chain|warehouse|shipping|dispatcher|driver|truck\s+driver)\b/i, slug: "logistics" },
  { re: /\b(retail|store\s+manager|shop\s+assistant|sales\s+associate|cashier)\b/i, slug: "retail" },
  { re: /\b(hospitality|hotel|restaurant|chef|cook|waiter|barista|housekeeping|tourism)\b/i, slug: "hospitality" },

  // --- Admin / other ------------------------------------------------
  { re: /\b(admin(istrative)?\s+assistant|office\s+manager|receptionist|executive\s+assistant|secretary|data\s+entry)\b/i, slug: "admin" },
];

const TAG_RULES: Rule[] = [
  { re: /^(ai|artificial-intelligence|machine-learning|ml|data-science|data)$/i, slug: "artificial-intelligence" },
  { re: /^(devops|sre|infrastructure|cloud)$/i, slug: "devops" },
  { re: /^(frontend|backend|full-stack|software|engineering|development|programming)$/i, slug: "software-engineering" },
  { re: /^(design|ui|ux|product-design)$/i, slug: "design" },
  { re: /^(marketing|growth|seo|content-marketing)$/i, slug: "marketing" },
  { re: /^(sales|business-development|account-management)$/i, slug: "sales" },
  { re: /^(finance|accounting|fintech)$/i, slug: "finance" },
  { re: /^(healthcare|medical|clinical|nursing)$/i, slug: "healthcare" },
  { re: /^(education|teaching|edtech)$/i, slug: "education" },
  { re: /^(customer-support|support|customer-service)$/i, slug: "customer-support" },
  { re: /^(hr|human-resources|recruiting|people)$/i, slug: "human-resources" },
  { re: /^(legal|compliance)$/i, slug: "legal" },
  { re: /^(operations|ops|supply-chain|logistics)$/i, slug: "operations" },
];

/**
 * Infer the canonical category slug for a job.
 *
 * @param title Human-curated job title (strongest signal)
 * @param tags  Optional list of job tags (secondary signal)
 * @returns     A slug from `CategorySlug`, or `null` when nothing
 *              confidently matches.
 */
export function inferCategorySlug(
  title: string | null | undefined,
  tags?: readonly string[] | null,
): CategorySlug | null {
  const cleanTitle = (title || "").trim();

  if (cleanTitle) {
    for (const rule of TITLE_RULES) {
      if (rule.re.test(cleanTitle)) return rule.slug;
    }
  }

  if (tags && tags.length > 0) {
    for (const tag of tags) {
      const clean = tag.trim();
      if (!clean) continue;
      for (const rule of TAG_RULES) {
        if (rule.re.test(clean)) return rule.slug;
      }
    }
  }

  return null;
}

/**
 * Canonical list of categories this module knows how to detect.
 * Used by the seed/backfill script. Keep in sync with TITLE_RULES.
 */
export const CANONICAL_CATEGORIES: ReadonlyArray<{
  slug: CategorySlug;
  name: string;
}> = [
  { slug: "software-engineering", name: "Software Engineering" },
  { slug: "engineering", name: "Engineering" },
  { slug: "design", name: "Design" },
  { slug: "ux-design", name: "UX Design" },
  { slug: "marketing", name: "Marketing" },
  { slug: "digital-marketing", name: "Digital Marketing" },
  { slug: "sales", name: "Sales" },
  { slug: "finance", name: "Finance" },
  { slug: "accounting", name: "Accounting" },
  { slug: "healthcare", name: "Healthcare" },
  { slug: "education", name: "Education" },
  { slug: "customer-support", name: "Customer Support" },
  { slug: "customer-service", name: "Customer Service" },
  { slug: "operations", name: "Operations" },
  { slug: "human-resources", name: "Human Resources" },
  { slug: "legal", name: "Legal" },
  { slug: "data-science", name: "Data Science" },
  { slug: "data-analytics", name: "Data Analytics" },
  { slug: "artificial-intelligence", name: "Artificial Intelligence" },
  { slug: "machine-learning", name: "Machine Learning" },
  { slug: "product-management", name: "Product Management" },
  { slug: "project-management", name: "Project Management" },
  { slug: "quality-assurance", name: "Quality Assurance" },
  { slug: "devops", name: "DevOps" },
  { slug: "it-support", name: "IT Support" },
  { slug: "writing", name: "Writing" },
  { slug: "content-writing", name: "Content Writing" },
  { slug: "translation", name: "Translation" },
  { slug: "retail", name: "Retail" },
  { slug: "hospitality", name: "Hospitality" },
  { slug: "construction", name: "Construction" },
  { slug: "manufacturing", name: "Manufacturing" },
  { slug: "logistics", name: "Logistics" },
  { slug: "admin", name: "Administration" },
  { slug: "research", name: "Research" },
  { slug: "science", name: "Science" },
];
