#!/usr/bin/env node
/**
 * One-shot backfill for job categories.
 *
 * What it does
 * ------------
 *   1. Ensures every canonical category exists in the `Category` table
 *      (idempotent — uses `upsert` on `slug`).
 *   2. Finds every Job whose `categoryId` is NULL.
 *   3. For each such job, infers a category slug from the title (and,
 *      as a fallback, from tags), then sets `categoryId` accordingly.
 *   4. Reports how many jobs were updated / skipped.
 *
 * Safety
 * ------
 *   - Only jobs with `categoryId === null` are touched. Any job that
 *     already has a category keeps it.
 *   - Deterministic. Running twice is a no-op after the first run.
 *   - Does NOT touch the ingestion pipeline, API routes, or anything
 *     in `src/`. This script is meant to be run once, locally, against
 *     the production database using the DATABASE_URL env var.
 *
 * Usage
 * -----
 *   Dry-run (no writes):
 *     DATABASE_URL="postgresql://..." node scripts/backfill-categories.mjs --dry
 *
 *   Apply changes:
 *     DATABASE_URL="postgresql://..." node scripts/backfill-categories.mjs
 *
 *   Limit to N jobs (useful for a staged rollout):
 *     DATABASE_URL="postgresql://..." node scripts/backfill-categories.mjs --limit 500
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const args = process.argv.slice(2);
const DRY = args.includes("--dry");
const LIMIT_ARG_IDX = args.indexOf("--limit");
const LIMIT =
  LIMIT_ARG_IDX >= 0 && args[LIMIT_ARG_IDX + 1]
    ? Math.max(0, parseInt(args[LIMIT_ARG_IDX + 1], 10) || 0)
    : 0;

/* ------------------------------------------------------------------ */
/* Canonical categories — must stay in sync with                       */
/* src/lib/jobs/ingestion/categorize.ts (CANONICAL_CATEGORIES).        */
/* ------------------------------------------------------------------ */

const CANONICAL_CATEGORIES = [
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

/* ------------------------------------------------------------------ */
/* Inference rules — mirror of TITLE_RULES / TAG_RULES in categorize.ts */
/* ------------------------------------------------------------------ */

const TITLE_RULES = [
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
  { re: /\b(nurse|nursing|physician|doctor|clinician|therapist|medical|healthcare|pharmacist|dentist|surgeon|health\s+care)\b/i, slug: "healthcare" },
  { re: /\b(teacher|tutor|instructor|professor|lecturer|education|educator|teaching\s+assistant)\b/i, slug: "education" },
  { re: /\b(research\s+scientist|research\s+assistant|researcher|postdoc)\b/i, slug: "research" },
  { re: /\b(scientist|science)\b/i, slug: "science" },
  { re: /\b(customer\s+support|technical\s+support|help\s*desk|support\s+engineer|support\s+specialist)\b/i, slug: "customer-support" },
  { re: /\b(customer\s+service|customer\s+care|call\s+center|client\s+service|service\s+representative)\b/i, slug: "customer-service" },
  { re: /\b(it\s+support|system\s+administrator|sysadmin|network\s+administrator|helpdesk)\b/i, slug: "it-support" },
  { re: /\b(content\s+writer|content\s+creator|content\s+specialist|copywriter|technical\s+writer)\b/i, slug: "content-writing" },
  { re: /\b(writer|writing|editor|proofreader|journalist)\b/i, slug: "writing" },
  { re: /\b(translator|translation|localization|localisation)\b/i, slug: "translation" },
  { re: /\b(construction|site\s+engineer|civil\s+engineer|foreman|architect)\b/i, slug: "construction" },
  { re: /\b(manufactur|production\s+operator|assembly|machinist|welder|factory)\b/i, slug: "manufacturing" },
  { re: /\b(logistics|supply\s+chain|warehouse|shipping|dispatcher|driver|truck\s+driver)\b/i, slug: "logistics" },
  { re: /\b(retail|store\s+manager|shop\s+assistant|sales\s+associate|cashier)\b/i, slug: "retail" },
  { re: /\b(hospitality|hotel|restaurant|chef|cook|waiter|barista|housekeeping|tourism)\b/i, slug: "hospitality" },
  { re: /\b(admin(istrative)?\s+assistant|office\s+manager|receptionist|executive\s+assistant|secretary|data\s+entry)\b/i, slug: "admin" },
];

const TAG_RULES = [
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

function inferCategorySlug(title, tags) {
  const cleanTitle = (title || "").trim();
  if (cleanTitle) {
    for (const rule of TITLE_RULES) {
      if (rule.re.test(cleanTitle)) return rule.slug;
    }
  }
  if (Array.isArray(tags)) {
    for (const raw of tags) {
      const tag = String(raw || "").trim();
      if (!tag) continue;
      for (const rule of TAG_RULES) {
        if (rule.re.test(tag)) return rule.slug;
      }
    }
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* Step 1 — seed canonical categories (idempotent upsert)              */
/* ------------------------------------------------------------------ */

async function seedCategories() {
  console.log(`\n[1/2] Seeding ${CANONICAL_CATEGORIES.length} categories...`);
  let created = 0;
  let existing = 0;

  for (const c of CANONICAL_CATEGORIES) {
    const before = await prisma.category.findUnique({
      where: { slug: c.slug },
      select: { id: true },
    });

    if (DRY) {
      if (before) existing += 1;
      else created += 1;
      continue;
    }

    await prisma.category.upsert({
      where: { slug: c.slug },
      create: { slug: c.slug, name: c.name },
      update: {}, // never overwrite an admin-edited name
    });

    if (before) existing += 1;
    else created += 1;
  }

  console.log(
    `      ${DRY ? "[DRY] " : ""}created: ${created}, already present: ${existing}`,
  );
}

/* ------------------------------------------------------------------ */
/* Step 2 — backfill job.categoryId                                    */
/* ------------------------------------------------------------------ */

async function backfillJobs() {
  console.log(`\n[2/2] Backfilling job.categoryId...`);

  // Preload category id by slug so we don't re-query inside the loop.
  const allCategories = await prisma.category.findMany({
    select: { id: true, slug: true },
  });
  const slugToId = new Map(allCategories.map((c) => [c.slug, c.id]));

  const total = await prisma.job.count({
    where: { categoryId: null },
  });
  console.log(`      jobs with categoryId=null: ${total}`);
  if (total === 0) {
    console.log("      nothing to do.");
    return { scanned: 0, updated: 0, skipped: 0 };
  }

  const batchSize = 200;
  const maxToProcess = LIMIT > 0 ? LIMIT : total;
  let scanned = 0;
  let updated = 0;
  let skipped = 0;

  while (scanned < maxToProcess) {
    const remaining = maxToProcess - scanned;
    const take = Math.min(batchSize, remaining);

    const batch = await prisma.job.findMany({
      where: { categoryId: null },
      select: { id: true, title: true, tags: true },
      take,
      orderBy: { createdAt: "asc" },
    });

    if (batch.length === 0) break;

    for (const job of batch) {
      scanned += 1;
      const slug = inferCategorySlug(job.title, job.tags);
      if (!slug) {
        skipped += 1;
        continue;
      }
      const catId = slugToId.get(slug);
      if (!catId) {
        // Should never happen after step 1, but fail safe.
        skipped += 1;
        continue;
      }

      if (!DRY) {
        try {
          await prisma.job.update({
            where: { id: job.id },
            data: { categoryId: catId },
          });
        } catch (e) {
          console.error(`      failed to update ${job.id}:`, e?.message || e);
          skipped += 1;
          continue;
        }
      }

      updated += 1;
    }

    console.log(
      `      scanned: ${scanned}, updated: ${updated}, skipped: ${skipped}`,
    );

    if (batch.length < take) break;
  }

  console.log(
    `\n      ${DRY ? "[DRY] " : ""}done. scanned=${scanned}, updated=${updated}, skipped=${skipped}`,
  );

  return { scanned, updated, skipped };
}

/* ------------------------------------------------------------------ */
/* Entry point                                                         */
/* ------------------------------------------------------------------ */

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set.");
    process.exit(1);
  }

  console.log(
    `\nBackfill categories ${DRY ? "[DRY RUN — no writes] " : ""}${LIMIT > 0 ? `[limit=${LIMIT}]` : ""}`,
  );

  try {
    await seedCategories();
    await backfillJobs();
  } catch (err) {
    console.error("\nFatal:", err);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main();
