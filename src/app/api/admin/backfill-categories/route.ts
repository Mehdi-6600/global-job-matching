import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

const TOKEN = "gjm-backfill-2026";

const CATS = [
  ["software-engineering", "Software Engineering"],
  ["engineering", "Engineering"],
  ["design", "Design"],
  ["ux-design", "UX Design"],
  ["marketing", "Marketing"],
  ["digital-marketing", "Digital Marketing"],
  ["sales", "Sales"],
  ["finance", "Finance"],
  ["accounting", "Accounting"],
  ["healthcare", "Healthcare"],
  ["education", "Education"],
  ["customer-support", "Customer Support"],
  ["customer-service", "Customer Service"],
  ["operations", "Operations"],
  ["human-resources", "Human Resources"],
  ["legal", "Legal"],
  ["data-science", "Data Science"],
  ["data-analytics", "Data Analytics"],
  ["artificial-intelligence", "Artificial Intelligence"],
  ["machine-learning", "Machine Learning"],
  ["product-management", "Product Management"],
  ["project-management", "Project Management"],
  ["quality-assurance", "Quality Assurance"],
  ["devops", "DevOps"],
  ["it-support", "IT Support"],
  ["writing", "Writing"],
  ["content-writing", "Content Writing"],
  ["translation", "Translation"],
  ["retail", "Retail"],
  ["hospitality", "Hospitality"],
  ["construction", "Construction"],
  ["manufacturing", "Manufacturing"],
  ["logistics", "Logistics"],
  ["admin", "Administration"],
  ["research", "Research"],
  ["science", "Science"],
];

const RULES: Array<[RegExp, string]> = [
  [/\b(devops|sre|platform\s+engineer)\b/i, "devops"],
  [/\b(machine\s*learning|ml\s+engineer|ml\s+scientist)\b/i, "machine-learning"],
  [/\b(ai|artificial\s+intelligence|llm|nlp)\b/i, "artificial-intelligence"],
  [/\b(data\s+scientist|data\s+science)\b/i, "data-science"],
  [/\b(data\s+analyst|analytics\s+engineer|\bbi\b)\b/i, "data-analytics"],
  [/\b(qa|quality\s+assurance|test\s+engineer|selenium|cypress)\b/i, "quality-assurance"],
  [/\b(ux|user\s+experience|product\s+designer)\b/i, "ux-design"],
  [/\b(software\s+engineer|software\s+developer|frontend|front[-\s]?end|backend|back[-\s]?end|full[-\s]?stack|web\s+developer|mobile\s+developer|ios|android|react|node|javascript|typescript|python\s+developer|java\s+developer)\b/i, "software-engineering"],
  [/\b(engineer|engineering)\b/i, "engineering"],
  [/\b(designer|design|ui)\b/i, "design"],
  [/\b(digital\s+marketing|seo|sem|growth\s+marketing)\b/i, "digital-marketing"],
  [/\b(marketing|brand\s+manager|market\s+research)\b/i, "marketing"],
  [/\b(sales|account\s+executive|account\s+manager|business\s+development|sdr|bdr)\b/i, "sales"],
  [/\b(accountant|accounting|bookkeep|audit|tax)\b/i, "accounting"],
  [/\b(finance|financial\s+analyst|fp&a|controller|cfo)\b/i, "finance"],
  [/\b(human\s+resources|recruiter|talent\s+acquisition|\bhr\b)\b/i, "human-resources"],
  [/\b(operations\s+manager|operations\s+lead|\bcoo\b|operations)\b/i, "operations"],
  [/\b(project\s+manager|program\s+manager|\bpmo\b)\b/i, "project-management"],
  [/\b(product\s+manager|product\s+owner|head\s+of\s+product)\b/i, "product-management"],
  [/\b(legal|counsel|attorney|lawyer|paralegal)\b/i, "legal"],
  [/\b(nurse|nursing|physician|doctor|clinician|therapist|medical|healthcare|pharmacist)\b/i, "healthcare"],
  [/\b(teacher|tutor|instructor|professor|lecturer|education|educator)\b/i, "education"],
  [/\b(researcher|research\s+scientist|postdoc)\b/i, "research"],
  [/\b(scientist|science)\b/i, "science"],
  [/\b(customer\s+support|technical\s+support|help\s*desk|helpdesk)\b/i, "customer-support"],
  [/\b(customer\s+service|customer\s+care|call\s+center|client\s+service)\b/i, "customer-service"],
  [/\b(it\s+support|sysadmin|system\s+administrator)\b/i, "it-support"],
  [/\b(content\s+writer|copywriter|technical\s+writer)\b/i, "content-writing"],
  [/\b(writer|editor|proofreader|journalist)\b/i, "writing"],
  [/\b(translator|translation|localization)\b/i, "translation"],
  [/\b(construction|civil\s+engineer|foreman|architect)\b/i, "construction"],
  [/\b(manufactur|production\s+operator|machinist|welder|factory)\b/i, "manufacturing"],
  [/\b(logistics|supply\s+chain|warehouse|shipping|driver)\b/i, "logistics"],
  [/\b(retail|store\s+manager|cashier|shop\s+assistant)\b/i, "retail"],
  [/\b(hospitality|hotel|restaurant|chef|cook|waiter|barista|tourism)\b/i, "hospitality"],
  [/\b(admin\s+assistant|office\s+manager|receptionist|secretary|data\s+entry)\b/i, "admin"],
];

function infer(title: string | null | undefined, tags: readonly string[] | null | undefined): string | null {
  const t = (title || "").trim();
  if (t) for (const [re, slug] of RULES) if (re.test(t)) return slug;
  if (Array.isArray(tags)) for (const raw of tags) {
    const tag = String(raw || "").trim();
    if (!tag) continue;
    for (const [re, slug] of RULES) if (re.test(tag)) return slug;
  }
  return null;
}

async function handle(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  if (searchParams.get("token") !== TOKEN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const dry = searchParams.get("dry") === "1";

  let catCreated = 0;
  let catExisting = 0;
  for (const [slug, name] of CATS) {
    const before = await db.category.findUnique({ where: { slug }, select: { id: true } });
    if (before) { catExisting++; continue; }
    if (!dry) await db.category.upsert({ where: { slug }, create: { slug, name }, update: {} });
    catCreated++;
  }

  const allCats = await db.category.findMany({ select: { id: true, slug: true } });
  const map = new Map(allCats.map((c) => [c.slug, c.id]));

  const total = await db.job.count({ where: { categoryId: null } });
  let scanned = 0, updated = 0, skipped = 0;
  const skippedSamples: string[] = [];

  while (scanned < total) {
    const batch = await db.job.findMany({
      where: { categoryId: null },
      select: { id: true, title: true, tags: true },
      take: 200,
      orderBy: { createdAt: "asc" },
    });
    if (batch.length === 0) break;
    for (const job of batch) {
      scanned++;
      const slug = infer(job.title, job.tags);
      if (!slug) { skipped++; if (skippedSamples.length < 15) skippedSamples.push(job.title); continue; }
      const catId = map.get(slug);
      if (!catId) { skipped++; continue; }
      if (!dry) {
        try { await db.job.update({ where: { id: job.id }, data: { categoryId: catId } }); }
        catch { skipped++; continue; }
      }
      updated++;
    }
  }

  return NextResponse.json({
    ok: true, dry,
    categories: { total: CATS.length, created: catCreated, alreadyPresent: catExisting },
    jobs: { totalUncategorized: total, processed: scanned, updated, skipped, skippedSamples },
  });
}

export async function GET(req: NextRequest) { return handle(req); }
export async function POST(req: NextRequest) { return handle(req); }
