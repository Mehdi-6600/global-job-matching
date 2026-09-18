import type {
  CareerRiskAnalysis,
  CareerRiskLevel,
  CareerRiskLocale,
  CareerRiskSource,
  CareerRiskSubScores,
  CareerRiskSuccessResponse,
} from "@/types/career-risk";
import { careerRiskAiOutputSchema } from "@/types/career-risk";
import {
  buildCareerProfile,
  highAutomationTasks,
  resilientTasks,
  taskAutomationExposure,
  humanMoatScore,
  taskLabel,
  type CareerProfile,
} from "@/lib/career-intelligence/profile";

/* ------------------------------------------------------------------ */
/* Re-exports                                                          */
/* ------------------------------------------------------------------ */

export type { CareerRiskAnalysis, CareerRiskLevel, CareerRiskSource };
export {
  CAREER_RISK_DISCLAIMER_EN,
  CAREER_RISK_DISCLAIMER_FA,
  careerRiskRequestSchema,
} from "@/types/career-risk";

/* ------------------------------------------------------------------ */
/* ابزارهای پایه                                                       */
/* ------------------------------------------------------------------ */

/**
 * بررسی می‌کند که آیا پلن کاربر از نوع پرداختی است یا خیر.
 */
export function isPaidPlan(plan: string | null | undefined): boolean {
  const p = String(plan || "free").toLowerCase();
  return p === "pro" || p === "business" || p === "enterprise";
}

/**
 * یک عدد را به بازه‌ی ۰ تا ۱۰۰ محدود و به نزدیک‌ترین عدد صحیح گرد می‌کند.
 * اگر عدد نامعتبر باشد، مقدار پیش‌فرض ۵۰ برگردانده می‌شود.
 */
export function clampScore(n: number): number {
  if (!Number.isFinite(n)) return 50;
  return Math.max(0, Math.min(100, Math.round(n)));
}

/**
 * بر اساس امتیاز ریسک، سطح ریسک را تعیین می‌کند:
 * - کمتر از ۳۵ → low
 * - بین ۳۵ تا ۶۵ → medium
 * - ۶۵ و بالاتر → high
 */
export function scoreToRiskLevel(score: number): CareerRiskLevel {
  const s = clampScore(score);
  if (s < 35) return "low";
  if (s < 65) return "medium";
  return "high";
}

/**
 * لوکال درخواست را نرمال‌سازی می‌کند.
 * فقط لوکال‌های پشتیبانی‌شده پذیرفته می‌شوند؛ در غیر این صورت `en`.
 */
export function normalizeCareerLocale(
  raw: string | null | undefined
): CareerRiskLocale {
  const p = String(raw || "en").toLowerCase().slice(0, 2);
  if (
    p === "fa" ||
    p === "ar" ||
    p === "es" ||
    p === "fr" ||
    p === "hi" ||
    p === "de"
  ) {
    return p;
  }
  return "en";
}

/**
 * نام کامل زبان را برای استفاده در پرامپت AI برمی‌گرداند.
 */
export function languageNameForPrompt(locale: CareerRiskLocale): string {
  switch (locale) {
    case "fa":
      return "Persian (Farsi)";
    case "ar":
      return "Arabic";
    case "es":
      return "Spanish";
    case "fr":
      return "French";
    case "hi":
      return "Hindi";
    case "de":
      return "German";
    default:
      return "English";
  }
}

/* ------------------------------------------------------------------ */
/* متن‌های چندزبانه‌ی heuristic                                        */
/* ------------------------------------------------------------------ */

/** نگاشت لوکال به یک رشته‌ی متنی. */
type LocaleCopy = Record<CareerRiskLocale, string>;

/** انتخاب مقدار مناسب از جدول بر اساس لوکال، با fallback به انگلیسی. */
function L(locale: CareerRiskLocale, table: LocaleCopy): string {
  return table[locale] || table.en;
}

/** افق زمانی پیش‌فرض به‌ازای هر لوکال. */
const TIME_HORIZON: LocaleCopy = {
  en: "5–10 years",
  es: "5–10 años",
  ar: "٥–١٠ سنوات",
  fa: "۵–۱۰ سال",
  hi: "5–10 वर्ष",
  fr: "5–10 ans",
  de: "5–10 Jahre",
};

/** پیام ارتقا به پلن Pro برای کاربران رایگان. */
const UPGRADE_MSG: LocaleCopy = {
  en: "Upgrade to Pro to unlock alternative role recommendations.",
  es: "Mejora a Pro para desbloquear recomendaciones de roles alternativos.",
  ar: "قم بالترقية إلى Pro لفتح توصيات الأدوار البديلة.",
  fa: "برای مسیرهای جایگزین، به پلن Pro ارتقا دهید.",
  hi: "वैकल्पिक भूमिका सुझाव अनलॉक करने के लिए Pro में अपग्रेड करें।",
  fr: "Passez à Pro pour débloquer les recommandations de rôles alternatifs.",
  de: "Upgrade auf Pro, um alternative Rollenempfehlungen freizuschalten.",
};

/**
 * عبارت مکان را بر اساس لوکال می‌سازد.
 */
function placePhrase(locale: CareerRiskLocale, place: string): string {
  if (!place) return "";
  switch (locale) {
    case "es":
      return ` en ${place}`;
    case "ar":
      return ` في ${place}`;
    case "fa":
      return ` در ${place}`;
    case "hi":
      return ` (${place})`;
    case "fr":
      return ` à ${place}`;
    case "de":
      return ` in ${place}`;
    default:
      return ` in ${place}`;
  }
}

/**
 * ساخت خلاصه‌ی تحلیلی بر اساس لوکال، عنوان شغلی، مکان و امتیاز ریسک.
 * سه سطح ریسک (بالا، متوسط، پایین) با متن اختصاصی هر لوکال پوشش داده می‌شود.
 */
function summaryFor(
  locale: CareerRiskLocale,
  title: string,
  place: string,
  score: number
): string {
  const p = placePhrase(locale, place);

  /* -------- ریسک بالا -------- */
  if (score >= 65) {
    return L(locale, {
      en: `The role «${title}»${p} shows elevated exposure to automation over the next 5–10 years. Routine parts of the work are increasingly supported by software and AI, so staying relevant requires deliberate upskilling, portfolio proof, and roles that keep human judgment at the center.`,
      es: `El rol «${title}»${p} muestra una exposición elevada a la automatización en los próximos 5–10 años. Las partes rutinarias del trabajo reciben cada vez más apoyo de software e IA; mantenerse relevante exige mejorar habilidades, demostrar resultados y priorizar el juicio humano.`,
      ar: `يُظهر دور «${title}»${p} تعرضاً مرتفعاً للأتمتة خلال ٥–١٠ سنوات القادمة. الأجزاء الروتينية من العمل تتلقى دعماً متزايداً من البرمجيات والذكاء الاصطناعي، لذا يتطلب البقاء في السوق تطوير مهارات متعمداً وإثباتاً عملياً مع الإبقاء على الحكم البشري في المركز.`,
      fa: `نقش «${title}»${p} در افق ۵ تا ۱۰ سال، در معرض اتوماسیون نسبتاً بالا است. بخش‌های تکراری کار بیش از پیش با نرم‌افزار و هوش مصنوعی پشتیبانی می‌شود؛ برای ماندگاری باید مهارت‌های متمایز، نمونه‌کار مشخص و وظایفی که به قضاوت انسانی وابسته‌اند تقویت شوند. این برآورد آفلاین است و جایگزین مشاوره تخصصی نیست.`,
      hi: `भूमिका «${title}»${p} अगले 5–10 वर्षों में स्वचालन के उच्च जोखिम में है। काम के दोहराव वाले हिस्से सॉफ़्टवेयर/AI से तेज़ी से सपोर्ट हो रहे हैं; प्रासंगिक बने रहने के लिए अपस्किलिंग, पोर्टफोलियो प्रमाण और मानवीय निर्णय वाली भूमिकाएँ ज़रूरी हैं।`,
      fr: `Le rôle «${title}»${p} présente une exposition élevée à l'automatisation sur 5–10 ans. Les parties routinières du travail sont de plus en plus assistées par des logiciels et l'IA ; rester pertinent exige une montée en compétences délibérée et des missions centrées sur le jugement humain.`,
      de: `Die Rolle «${title}»${p} zeigt in den nächsten 5–10 Jahren ein erhöhtes Automatisierungsrisiko. Routineanteile werden zunehmend durch Software und KI unterstützt; relevant zu bleiben erfordert gezielte Weiterbildung und Aufgaben mit menschlichem Urteil.`,
    });
  }

  /* -------- ریسک متوسط -------- */
  if (score >= 35) {
    return L(locale, {
      en: `The role «${title}»${p} faces moderate AI-driven change over 5–10 years. Tools will reshape workflows rather than erase the job overnight. People who combine domain depth with digital fluency and clear communication tend to adapt best.`,
      es: `El rol «${title}»${p} enfrenta un cambio moderado impulsado por IA en 5–10 años. Las herramientas reconfigurarán los flujos de trabajo más que eliminar el empleo de golpe. Quienes combinen profundidad de dominio con fluidez digital y comunicación clara suelen adaptarse mejor.`,
      ar: `يواجه دور «${title}»${p} تغييراً متوسطاً بفعل الذكاء الاصطناعي خلال ٥–١٠ سنوات. ستعيد الأدوات تشكيل سير العمل أكثر من إلغاء الوظيفة فجأة. من يجمع عمق التخصص مع المهارات الرقمية والتواصل الواضح يتكيف عادة بشكل أفضل.`,
      fa: `نقش «${title}»${p} در افق ۵ تا ۱۰ سال با تغییر متوسط ناشی از AI روبه‌روست. ابزارها بیشتر جریان کار را بازطراحی می‌کنند تا اینکه یک‌شبه شغل را حذف کنند. کسانی که عمق تخصصی را با سواد دیجیتال و ارتباط شفاف ترکیب می‌کنند معمولاً بهتر سازگار می‌شوند. این تحلیل آفلاین/تخمینی است.`,
      hi: `भूमिका «${title}»${p} में अगले 5–10 वर्षों में AI से मध्यम बदलाव अपेक्षित है। उपकरण काम के प्रवाह को बदलेंगे, नौकरी को एक झटके में खत्म नहीं करेंगे। डोमेन गहराई + डिजिटल कुशलता + स्पष्ट संचार वाले लोग बेहतर अनुकूल होते हैं।`,
      fr: `Le rôle «${title}»${p} subit un changement modéré lié à l'IA sur 5–10 ans. Les outils reconfigurent les flux de travail plus qu'ils n'effacent l'emploi du jour au lendemain. Ceux qui allient expertise métier, aisance numérique et communication claire s'adaptent généralement mieux.`,
      de: `Die Rolle «${title}»${p} steht in den nächsten 5–10 Jahren vor moderatem KI-getriebenem Wandel. Tools verändern eher Arbeitsabläufe, als den Beruf über Nacht zu ersetzen. Wer Fachtiefe mit digitaler Kompetenz und klarer Kommunikation verbindet, passt sich meist besser an.`,
    });
  }

  /* -------- ریسک پایین -------- */
  return L(locale, {
    en: `The role «${title}»${p} looks relatively resilient in the near term. Physical presence, regulated judgment, or local trust still limit full automation. Continuous learning remains useful, but the core of the work is less exposed than highly routine digital tasks.`,
    es: `El rol «${title}»${p} parece relativamente resiliente a corto plazo. La presencia física, el juicio regulado o la confianza local limitan la automatización total. El aprendizaje continuo sigue siendo útil, pero el núcleo del trabajo está menos expuesto que las tareas digitales muy rutinarias.`,
    ar: `يبدو دور «${title}»${p} مقاوماً نسبياً على المدى القريب. الحضور الميداني أو الحكم المنظم أو الثقة المحلية تحد من الأتمتة الكاملة. يبقى التعلم المستمر مفيداً، لكن جوهر العمل أقل تعرضاً من المهام الرقمية الروتينية للغاية.`,
    fa: `نقش «${title}»${p} در کوتاه‌مدت نسبتاً مقاوم است. حضور فیزیکی، قضاوت تنظیم‌شده یا اعتماد محلی هنوز مانع اتوماسیون کامل می‌شود. یادگیری مداوم مفید است، اما هسته کار کمتر از وظایف کاملاً تکراری دیجیتال در معرض فشار ابزارهای خودکار قرار دارد. این برآورد آفلاین است و باید با شرایط واقعی بازار محلی تطبیق داده شود.`,
    hi: `भूमिका «${title}»${p} निकट अवधि में अपेक्षाकृत सुरक्षित दिखती है। भौतिक उपस्थिति, विनियमित निर्णय या स्थानीय विश्वास पूर्ण स्वचालन को सीमित करते हैं। निरंतर सीखना उपयोगी है, पर काम का मूल अत्यधिक दोहराव वाले डिजिटल कार्यों से कम जोखिम में है।`,
    fr: `Le rôle «${title}»${p} paraît relativement résilient à court terme. La présence physique, le jugement réglementé ou la confiance locale limitent encore l'automatisation totale. L'apprentissage continu reste utile, mais le cœur du métier est moins exposé que les tâches numériques très répétitives.`,
    de: `Die Rolle «${title}»${p} wirkt kurzfristig relativ widerstandsfähig. Physische Präsenz, reguliertes Urteil oder lokales Vertrauen begrenzen volle Automatisierung. Weiterbildung bleibt sinnvoll, doch der Kern der Arbeit ist weniger exponiert als stark repetitive digitale Aufgaben.`,
  });
}

/** مهارت‌های پیشنهادی پیش‌فرض به‌ازای هر لوکال. */
function defaultSkills(locale: CareerRiskLocale): string[] {
  return {
    en: ["Digital literacy", "Problem-solving", "Domain specialization"],
    es: [
      "Alfabetización digital",
      "Resolución de problemas",
      "Especialización de dominio",
    ],
    ar: ["محو الأمية الرقمية", "حل المشكلات", "تخصص المجال"],
    fa: ["سواد دیجیتال", "حل مسئله", "تخصص حوزه‌ای"],
    hi: ["डिजिटल साक्षरता", "समस्या समाधान", "क्षेत्र विशेषज्ञता"],
    fr: ["Culture numérique", "Résolution de problèmes", "Spécialisation métier"],
    de: ["Digitale Kompetenz", "Problemlösung", "Fachspezialisierung"],
  }[locale];
}

/** مسیرهای جایگزین پیش‌فرض به‌ازای هر لوکال. */
function defaultAlternatives(
  locale: CareerRiskLocale,
  title: string
): string[] {
  return {
    en: [
      `Hybrid ${title} + AI roles`,
      "Training or supervising automated tools",
      "Roles leaning on interpersonal skills",
    ],
    es: [
      `Roles híbridos ${title} + IA`,
      "Formación o supervisión de herramientas automatizadas",
      "Roles basados en habilidades interpersonales",
    ],
    ar: [
      `أدوار هجينة ${title} + ذكاء اصطناعي`,
      "التدريب أو الإشراف على الأدوات المؤتمتة",
      "أدوار تعتمد على المهارات الشخصية",
    ],
    fa: [
      `نقش‌های ترکیبی ${title} + هوش مصنوعی`,
      "آموزش یا نظارت بر ابزارهای خودکار",
      "نقش‌هایی متکی بر مهارت‌های بین‌فردی",
    ],
    hi: [
      `हाइब्रिड ${title} + AI भूमिकाएँ`,
      "स्वचालित उपकरणों का प्रशिक्षण/पर्यवेक्षण",
      "पारस्परिक कौशल वाली भूमिकाएँ",
    ],
    fr: [
      `Rôles hybrides ${title} + IA`,
      "Formation ou supervision d'outils automatisés",
      "Rôles axés sur les compétences interpersonnelles",
    ],
    de: [
      `Hybride ${title}+KI-Rollen`,
      "Schulung oder Aufsicht automatisierter Tools",
      "Rollen mit Fokus auf zwischenmenschliche Fähigkeiten",
    ],
  }[locale];
}

/* ------------------------------------------------------------------ */
/* پارس و اعتبارسنجی خروجی AI                                          */
/* ------------------------------------------------------------------ */

/**
 * یک مقدار ناشناخته را به آرایه‌ای از رشته‌های غیرخالی تبدیل می‌کند.
 * حداکثر `max` آیتم برگردانده می‌شود.
 */
function asStringArray(value: unknown, max = 12): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((v) => String(v ?? "").trim())
    .filter((s) => s.length > 0)
    .slice(0, max);
}

/**
 * پارس سخت‌گیرانه‌ی زیرامتیازها.
 * اگر هر یک از مقادیر نامعتبر باشد، `null` برگردانده می‌شود.
 */
export function parseSubScoresStrict(
  raw: unknown
): CareerRiskSubScores | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const keys = [
    "taskAutomation",
    "toolMaturity",
    "marketAdoption",
    "agenticExposure",
  ] as const;

  const out: Partial<CareerRiskSubScores> = {};
  for (const k of keys) {
    const n = Number(o[k]);
    if (!Number.isFinite(n) || n < 0 || n > 100) return null;
    out[k] = Math.round(n);
  }
  return out as CareerRiskSubScores;
}

/**
 * پارس نرم زیرامتیازها: فقط مقادیر معتبر را می‌پذیرد و
 * برای بقیه از مقدار پیش‌فرض استفاده می‌کند.
 */
function parseSubScoresSoft(raw: unknown): CareerRiskSubScores | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const o = raw as Record<string, unknown>;
  const one = (v: unknown, fallback: number) => {
    const n = Number(v);
    if (!Number.isFinite(n) || n < 0 || n > 100) return fallback;
    return Math.round(n);
  };
  return {
    taskAutomation: one(o.taskAutomation, 45),
    toolMaturity: one(o.toolMaturity, 45),
    marketAdoption: one(o.marketAdoption, 40),
    agenticExposure: one(o.agenticExposure, 35),
  };
}

/**
 * محاسبه‌ی امتیاز ترکیبی از زیرامتیازها.
 * فرمول:
 *   taskAutomation × (0.45 + 0.3 × toolMaturity + 0.25 × marketAdoption)
 *   + 0.1 × agenticExposure
 */
export function compositeFromSubScores(s: CareerRiskSubScores): number {
  const base =
    s.taskAutomation *
    (0.45 + 0.3 * (s.toolMaturity / 100) + 0.25 * (s.marketAdoption / 100));
  return clampScore(base + 0.1 * s.agenticExposure);
}

/**
 * هماهنگ‌سازی امتیاز ریسک با زیرامتیازها.
 *
 * اگر اختلاف زیاد باشد، مدل ناسازگار است و امتیاز ترکیبی ترجیح داده می‌شود.
 * اختلاف متوسط نیز به سمت امتیاز ترکیبی Blend می‌شود.
 */
export function reconcileScoreWithSubScores(
  riskScore: number,
  subScores: CareerRiskSubScores
): number {
  const composite = compositeFromSubScores(subScores);
  const raw = clampScore(riskScore);
  const gap = Math.abs(raw - composite);
  if (gap > 30) return composite;
  if (gap > 15) return clampScore(Math.round(raw * 0.4 + composite * 0.6));
  return raw;
}

/** فاصله‌ی امتیاز AI از امتیاز ترکیبی زیرامتیازها (۰ = هماهنگ). */
export function scoreSubScoreGap(
  riskScore: number,
  subScores: CareerRiskSubScores
): number {
  return Math.abs(clampScore(riskScore) - compositeFromSubScores(subScores));
}

/**
 * پارس خروجی JSON مدل AI.
 *
 * استراتژی:
 * 1) ابتدا با Zod (سخت‌گیرانه) اعتبارسنجی کن.
 * 2) اگر Zod شکست خورد، با پارس نرم ادامه بده تا مدل‌های ضعیف‌تر هم قابل استفاده باشند.
 * 3) حداقل به summary معتبر و امتیاز عددی نیاز داریم.
 */
export function parseRiskJson(
  text: string,
  userJobTitle: string
): CareerRiskAnalysis | null {
  if (!text || typeof text !== "string") return null;

  let jsonStr = text.trim();

  // حذف بلوک‌های ```json ... ```
  const fence = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence?.[1]) jsonStr = fence[1].trim();

  // استخراج اولین { ... } معتبر
  const start = jsonStr.indexOf("{");
  const end = jsonStr.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;

  try {
    const raw = JSON.parse(jsonStr.slice(start, end + 1)) as unknown;
    if (!raw || typeof raw !== "object") return null;
    const obj = raw as Record<string, unknown>;

    /* -------- اعتبارسنجی سخت‌گیرانه -------- */
    const strict = careerRiskAiOutputSchema.safeParse(raw);

    /* -------- استخراج summary -------- */
    const summary = String(
      strict.success ? strict.data.summary : obj.summary || ""
    ).trim();
    if (summary.length < 10) return null;

    /* -------- استخراج امتیاز -------- */
    const rawScore = Number(
      strict.success ? strict.data.riskScore : obj.riskScore
    );
    if (!Number.isFinite(rawScore)) return null;

    /* -------- زیرامتیازها -------- */
    const subScores =
      parseSubScoresStrict(
        strict.success ? strict.data.subScores : obj.subScores
      ) || parseSubScoresSoft(obj.subScores);

    /* -------- هماهنگ‌سازی امتیاز -------- */
    let riskScore = clampScore(rawScore);
    if (subScores) {
      riskScore = reconcileScoreWithSubScores(riskScore, subScores);
    }

    /* -------- دلایل و مهارت‌ها -------- */
    const reasons = asStringArray(
      strict.success ? strict.data.reasons : obj.reasons,
      10
    );
    const skillsToBuild = asStringArray(
      strict.success ? strict.data.skillsToBuild : obj.skillsToBuild,
      12
    );

    if (reasons.length === 0 && skillsToBuild.length === 0) {
      return null;
    }

    /* -------- اعتماد + سازگاری امتیاز -------- */
    const confidenceRaw = Number(
      strict.success ? strict.data.confidence : obj.confidence
    );
    let confidence = Number.isFinite(confidenceRaw)
      ? clampScore(confidenceRaw)
      : 55;
    let confidenceSource: "model" | "repaired" = "model";

    if (!subScores) {
      confidence = Math.min(confidence, 45);
      confidenceSource = "repaired";
    } else {
      const gapBefore = scoreSubScoreGap(clampScore(rawScore), subScores);
      if (gapBefore > 15) {
        confidence = Math.min(confidence, gapBefore > 30 ? 40 : 55);
        confidenceSource = "repaired";
      }
    }

    const meaningfulReasons = reasons.filter((r) => r.length >= 24);
    if (meaningfulReasons.length === 0 && skillsToBuild.length < 2) {
      return null;
    }

    /* -------- افق زمانی -------- */
    const timeHorizon = String(
      (strict.success ? strict.data.timeHorizon : obj.timeHorizon) ||
        "5–10 years"
    ).slice(0, 40);

    return {
      jobTitle: userJobTitle.trim().slice(0, 120),
      riskScore,
      riskLevel: scoreToRiskLevel(riskScore),
      summary: summary.slice(0, 2500),
      reasons:
        meaningfulReasons.length > 0
          ? meaningfulReasons.slice(0, 8)
          : reasons.length > 0
            ? reasons
            : ["Analysis based on role characteristics and provided context."],
      skillsToBuild:
        skillsToBuild.length > 0
          ? skillsToBuild
          : ["Domain specialization", "Digital literacy"],
      alternatives: asStringArray(
        strict.success ? strict.data.alternatives : obj.alternatives,
        10
      ),
      source: "ai",
      subScores,
      timeHorizon,
      confidence,
      confidenceSource,
      industryOutlook: (() => {
        const v = strict.success
          ? strict.data.industryOutlook
          : obj.industryOutlook;
        return v ? String(v).slice(0, 500) : undefined;
      })(),
    };
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/* تحلیل heuristic (آفلاین)                                            */
/* ------------------------------------------------------------------ */

/** نرمال‌سازی عنوان برای تشخیص حوزه. */
function normalizeTitle(s: string): string {
  return s
    .toLowerCase()
    .replace(/[\u064B-\u065F]/g, "") // حذف اعراب عربی/فارسی
    .replace(/\s+/g, " ")
    .trim();
}

/** بررسی می‌کند که آیا رشته شامل هر یک از کلیدواژه‌ها است. */
function includesAny(hay: string, needles: string[]): boolean {
  return needles.some((n) => hay.includes(n.toLowerCase()));
}

/** دسته‌بندی نقش‌ها برای تحلیل heuristic. */
type RoleBucket =
  | "care"
  | "trades"
  | "architecture"
  | "tech"
  | "frontend"
  | "finance"
  | "clerical"
  | "education"
  | "generic";

/** تشخیص حوزه‌ی نقش بر اساس عنوان و صنعت. */
function detectRoleBucket(title: string, industry: string): RoleBucket {
  const blob = `${normalizeTitle(title)} ${normalizeTitle(industry)}`;

  if (
    includesAny(blob, [
      "physio",
      "physiotherapist",
      "nurse",
      "doctor",
      "physician",
      "فیزیوتراپ",
      "پزشک",
      "پرستار",
      "دکتر",
    ])
  )
    return "care";

  if (
    includesAny(blob, [
      "architect",
      "معمار",
      "معماری",
      "architekt",
      "architecte",
    ])
  )
    return "architecture";

  if (
    includesAny(blob, [
      "electrician",
      "plumber",
      "mechanic",
      "chef",
      "برقکار",
      "مکانیک",
    ])
  )
    return "trades";

  if (includesAny(blob, ["teacher", "معلم", "استاد", "lehrer"]))
    return "education";

  if (
    includesAny(blob, [
      "data entry",
      "cashier",
      "clerk",
      "منشی",
      "صندوقدار",
    ])
  )
    return "clerical";

  if (includesAny(blob, ["frontend", "front-end", "فرانت"])) return "frontend";

  if (
    includesAny(blob, [
      "developer",
      "engineer",
      "software",
      "برنامه نویس",
      "توسعه دهنده",
    ])
  )
    return "tech";

  if (includesAny(blob, ["accountant", "حسابدار"])) return "finance";

  return "generic";
}

/**
 * محاسبه‌ی فشار مکانی بر اساس کشور و شهر.
 */
function locationPressure(
  country?: string,
  location?: string
): { delta: number; noteEn: string; noteFa: string } {
  const blob = `${country || ""} ${location || ""}`.toLowerCase();
  if (!blob.trim()) return { delta: 0, noteEn: "", noteFa: "" };

  if (
    includesAny(blob, [
      "berlin",
      "london",
      "singapore",
      "san francisco",
      "bangalore",
    ])
  ) {
    return {
      delta: 6,
      noteEn: `In ${location || country}, competitive digital adoption can raise tool pressure faster than average.`,
      noteFa: `در ${location || country} پذیرش ابزارهای دیجیتال می‌تواند فشار اتوماسیون را بالاتر ببرد.`,
    };
  }

  if (
    includesAny(blob, ["iran", "tehran", "تهران", "ایران", "india", "egypt"])
  ) {
    return {
      delta: -4,
      noteEn: `Local market structure in ${location || country} still relies heavily on in-person networks for many roles.`,
      noteFa: `بازار محلی در ${location || country} برای بسیاری از مشاغل همچنان به حضور فیزیکی و شبکه حرفه‌ای وابسته است.`,
    };
  }

  return {
    delta: 0,
    noteEn: `Location (${location || country}) can shift demand even when global automation trends are similar.`,
    noteFa: `مکان (${location || country}) می‌تواند تقاضای استخدام را جابه‌جا کند.`,
  };
}

/**
 * تحلیل heuristic ریسک شغلی.
 *
 * این تابع زمانی استفاده می‌شود که:
 * - سهمیه‌ی AI تمام شده باشد.
 * - خطای زیرساختی رخ داده باشد.
 * - خروجی AI نامعتبر باشد.
 *
 * خروجی آن کاملاً آفلاین و بر اساس قواعد است.
 */
export function heuristicCareerRisk(
  jobTitle: string,
  skills?: string,
  extra?: {
    industry?: string;
    experienceYears?: number;
    country?: string;
    location?: string;
    education?: string;
    locale?: string;
  }
): CareerRiskAnalysis {
  const locale = normalizeCareerLocale(extra?.locale);
  const profile: CareerProfile = buildCareerProfile({
    jobTitle,
    skills,
    industry: extra?.industry,
    experienceYears: extra?.experienceYears,
    country: extra?.country,
    location: extra?.location,
    education: extra?.education,
    locale,
  });

  const auto = taskAutomationExposure(profile);
  const moat = humanMoatScore(profile);
  const exposed = highAutomationTasks(profile);
  const resilient = resilientTasks(profile);

  // Sub-scores from profile evidence (deterministic)
  let taskAutomation = auto;
  let toolMaturity = Math.min(90, 40 + Math.round(profile.tools.length * 4));
  let marketAdoption = 40 + (profile.country || profile.location ? 8 : 0);
  let agenticExposure = Math.round(auto * 0.55 + (100 - moat) * 0.25);

  if (profile.roleFamily === "software_engineering") {
    toolMaturity = Math.min(95, toolMaturity + 20);
    agenticExposure = Math.min(90, agenticExposure + 12);
  }
  if (profile.roleFamily === "healthcare" || profile.roleFamily === "trades") {
    taskAutomation = Math.max(15, taskAutomation - 15);
    agenticExposure = Math.max(15, agenticExposure - 12);
  }
  if (profile.roleFamily === "operations_clerical") {
    taskAutomation = Math.min(92, taskAutomation + 15);
  }
  if (profile.seniority === "senior" || profile.seniority === "lead") {
    taskAutomation = Math.max(10, taskAutomation - 6);
  }
  if ((profile.yearsExperience ?? 0) >= 10) {
    taskAutomation = Math.max(10, taskAutomation - 4);
  }

  const subScores: CareerRiskSubScores = {
    taskAutomation: clampScore(taskAutomation),
    toolMaturity: clampScore(toolMaturity),
    marketAdoption: clampScore(marketAdoption),
    agenticExposure: clampScore(agenticExposure),
  };
  const score = compositeFromSubScores(subScores);

  const place = [profile.location, profile.country]
    .filter(Boolean)
    .join(locale === "fa" || locale === "ar" ? "، " : ", ");

  const reasons: string[] = [];

  for (const task of exposed.slice(0, 2)) {
    const label = taskLabel(task, locale);
    if (locale === "fa") {
      reasons.push(
        `در نقش «${profile.currentRole}»، کار «${label}» با سطح اتوماسیون حدود ${task.automation}٪ مشخص شده و از عوامل اصلی امتیاز ریسک است.`
      );
    } else {
      reasons.push(
        `In «${profile.currentRole}», the task «${label}» has ~${task.automation}% automation exposure and is a primary risk driver.`
      );
    }
  }

  for (const task of resilient.slice(0, 2)) {
    const label = taskLabel(task, locale);
    if (locale === "fa") {
      reasons.push(
        `نقطه قوت شما: «${label}» به قضاوت انسانی/تعامل/نظم مقرراتی وابسته است (قضاوت ${task.judgment}٪) و کمتر جایگزین‌پذیر است.`
      );
    } else {
      reasons.push(
        `Resilience factor: «${label}» depends on judgment/relationships/regulation (judgment ${task.judgment}%) and is harder to fully automate.`
      );
    }
  }

  if (profile.yearsExperience != null) {
    if (locale === "fa") {
      reasons.push(
        `با ${profile.yearsExperience} سال تجربه و سطح ${profile.seniority}، بخش قضاوت‌محور نقش نسبت به کار junior محافظت نسبی دارد — به شرط مستندسازی نتایج.`
      );
    } else {
      reasons.push(
        `With ${profile.yearsExperience} years and seniority «${profile.seniority}», judgment-heavy work is partially protected versus pure junior task mix — if outcomes are documented.`
      );
    }
  }

  if (profile.skills.length > 0) {
    const sample = profile.skills
      .slice(0, 4)
      .join(locale === "fa" ? "، " : ", ");
    if (locale === "fa") {
      reasons.push(
        `مهارت‌های اعلام‌شده (${sample}) در تحلیل شکاف مهارت و مسیر مقاوم‌سازی لحاظ شده‌اند.`
      );
    } else {
      reasons.push(
        `Declared skills (${sample}) were used to prioritize resilience and gap-closing actions.`
      );
    }
  }

  if (profile.uncertainty.length) {
    if (locale === "fa") {
      reasons.push(
        `اطلاعات ناقص (${profile.uncertainty.join("، ")}): تحلیل محافظه‌کارانه است و نباید با ارزیابی تخصصی جایگزین شود.`
      );
    } else {
      reasons.push(
        `Incomplete profile fields (${profile.uncertainty.join(", ")}): analysis is conservative and not a substitute for specialist advice.`
      );
    }
  }

  // اطمینان از حداقل تعداد دلایل
  while (reasons.length < 3) {
    reasons.push(
      locale === "fa"
        ? `خانواده شغلی «${profile.roleFamily}» در افق ۵–۱۰ سال با ترکیب متفاوتی از اتوماسیون و قضاوت انسانی روبه‌روست.`
        : `Role family «${profile.roleFamily}» faces a mixed automation/judgment outlook over 5–10 years.`
    );
  }

  const skillsToBuild =
    profile.missingSkills.length > 0
      ? profile.missingSkills.slice(0, 6)
      : defaultSkills(locale);

  const alternatives = defaultAlternatives(locale, profile.currentRole);

  // خلاصه‌ی شرطی‌شده بر اساس پروفایل (نه یک قالب یکسان)
  const topExposed = exposed[0] ? taskLabel(exposed[0], locale) : null;
  const topResilient = resilient[0] ? taskLabel(resilient[0], locale) : null;

  let summary: string;
  if (locale === "fa") {
    summary =
      `تحلیل آفلاین برای «${profile.currentRole}»` +
      (place ? ` در ${place}` : "") +
      (profile.specialization ? ` (تخصص محتمل: ${profile.specialization})` : "") +
      `. ` +
      (topExposed ? `بیشترین فشار اتوماسیون روی «${topExposed}» است. ` : "") +
      (topResilient ? `مقاومت بیشتر در «${topResilient}» دیده می‌شود. ` : "") +
      (profile.yearsExperience != null
        ? `تجربه ${profile.yearsExperience} ساله در امتیاز لحاظ شد. `
        : "") +
      (profile.skills.length
        ? `شکاف‌های پیشنهادی بر اساس مهارت‌های فعلی شما اولویت‌بندی شده‌اند. `
        : "بدون فهرست مهارت، توصیه‌ها کلی‌تر و با اطمینان کمترند. ") +
      `امتیاز ترکیبی ${score}/100 از مدل وظیفه/ابزار به‌دست آمده است — نه یک متن قالبی یکسان برای همه.`;
  } else {
    summary =
      `Offline analysis for «${profile.currentRole}»` +
      (place ? ` in ${place}` : "") +
      (profile.specialization ? ` (likely focus: ${profile.specialization})` : "") +
      `. ` +
      (topExposed ? `Highest automation pressure sits on «${topExposed}». ` : "") +
      (topResilient ? `Stronger resilience appears in «${topResilient}». ` : "") +
      (profile.yearsExperience != null
        ? `${profile.yearsExperience} years of experience adjusted the score. `
        : "") +
      (profile.skills.length
        ? `Skill-gap priorities reflect your declared toolkit. `
        : "Without listed skills, guidance stays broader and lower-confidence. ") +
      `Composite score ${score}/100 is derived from a task/tool model — not a one-size template.`;
  }

  return {
    jobTitle: profile.currentRole.slice(0, 120),
    riskScore: score,
    riskLevel: scoreToRiskLevel(score),
    summary: summary.slice(0, 2500),
    reasons: Array.from(new Set(reasons)).slice(0, 8),
    skillsToBuild: Array.from(new Set(skillsToBuild)).slice(0, 8),
    alternatives: Array.from(new Set(alternatives)).slice(0, 5),
    source: "heuristic",
    subScores,
    timeHorizon: L(locale, TIME_HORIZON),
    confidence: Math.min(
      62,
      40 + Math.round(profile.profileCompleteness * 0.25)
    ),
    confidenceSource: "offline_estimate",
    industryOutlook: industryOutlookLine(
      locale,
      profile.industry || "",
      place
    ),
  };
}

/* ------------------------------------------------------------------ */
/* پاسخ نهایی موفقیت                                                   */
/* ------------------------------------------------------------------ */

export function toSuccessResponse(params: {
  analysis: CareerRiskAnalysis;
  paid: boolean;
  assessmentId?: string;
  shareToken?: string;
  locale?: string;
}): CareerRiskSuccessResponse {
  const locale = normalizeCareerLocale(params.locale);
  const riskScore = clampScore(params.analysis.riskScore);
  const riskLevel = scoreToRiskLevel(riskScore);

  // مسیرهای جایگزین فقط برای کاربران پرداختی نمایش داده می‌شوند.
  const alternatives = params.paid ? params.analysis.alternatives : [];

  const analysis: CareerRiskAnalysis = {
    ...params.analysis,
    riskScore,
    riskLevel,
    alternatives,
  };

  return {
    success: true,
    analysis,
    paid: params.paid,
    alternativesLocked: !params.paid,
    message: params.paid ? undefined : L(locale, UPGRADE_MSG),
    assessmentId: params.assessmentId,
    shareToken: params.shareToken,
    sharePath: params.shareToken
      ? `/career-risk/share/${params.shareToken}`
      : undefined,
    jobTitle: analysis.jobTitle,
    riskScore: analysis.riskScore,
    riskLevel: analysis.riskLevel,
    summary: analysis.summary,
    reasons: analysis.reasons,
    skillsToBuild: analysis.skillsToBuild,
    alternatives,
    source: analysis.source,
  };
}
