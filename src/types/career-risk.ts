import { z } from "zod";

/* ------------------------------------------------------------------ */
/*  Risk levels & sources                                              */
/* ------------------------------------------------------------------ */

export const CAREER_RISK_LEVELS = ["low", "medium", "high"] as const;
export type CareerRiskLevel = (typeof CAREER_RISK_LEVELS)[number];

export const CAREER_RISK_SOURCES = ["ai", "heuristic"] as const;
export type CareerRiskSource = (typeof CAREER_RISK_SOURCES)[number];

export const CAREER_RISK_LOCALES = [
  "en",
  "fa",
  "ar",
  "es",
  "fr",
  "hi",
  "de",
] as const;
export type CareerRiskLocale = (typeof CAREER_RISK_LOCALES)[number];

export const CAREER_RISK_CONFIDENCE_SOURCES = [
  "model",
  "offline_estimate",
  "repaired",
] as const;
export type CareerRiskConfidenceSource =
  (typeof CAREER_RISK_CONFIDENCE_SOURCES)[number];

/* ------------------------------------------------------------------ */
/*  Domain types                                                       */
/* ------------------------------------------------------------------ */

export type CareerRiskSubScores = {
  taskAutomation: number;
  toolMaturity: number;
  marketAdoption: number;
  agenticExposure: number;
};

export type CareerRiskAnalysis = {
  jobTitle: string;
  riskScore: number;
  riskLevel: CareerRiskLevel;
  summary: string;
  reasons: string[];
  skillsToBuild: string[];
  alternatives: string[];
  source: CareerRiskSource;
  subScores?: CareerRiskSubScores;
  timeHorizon?: string;
  confidence?: number;
  /** model = claimed by AI; offline_estimate = heuristic; repaired = AI adjusted */
  confidenceSource?: CareerRiskConfidenceSource;
  industryOutlook?: string;
};

export type CareerRiskSuccessResponse = {
  success: true;
  analysis: CareerRiskAnalysis;
  paid: boolean;
  alternativesLocked: boolean;
  message?: string;
  assessmentId?: string;
  shareToken?: string;
  sharePath?: string;

  /* Denormalized fields for quick client access */
  jobTitle: string;
  riskScore: number;
  riskLevel: CareerRiskLevel;
  summary: string;
  reasons: string[];
  skillsToBuild: string[];
  alternatives: string[];
  source: CareerRiskSource;
};

export type CareerRiskErrorResponse = {
  success?: false;
  error: string;
  code?: string;
  limit?: number;
  used?: number;
  details?: unknown;
};

/* ------------------------------------------------------------------ */
/*  Form input & request schema                                        */
/* ------------------------------------------------------------------ */

export type CareerRiskFormInput = {
  jobTitle: string;
  skills?: string;
  industry?: string;
  experienceYears?: number;
  country?: string;
  location?: string;
  education?: string;
  locale?: CareerRiskLocale;
};

const experienceYearsSchema = z.preprocess(
  (v) => {
    if (v === "" || v === null || v === undefined) return undefined;
    const n = typeof v === "number" ? v : Number(v);
    return Number.isFinite(n) ? n : undefined;
  },
  z.number().min(0).max(50).optional(),
);

const optionalTrimmedString = (max: number) =>
  z.string().max(max).optional().or(z.literal(""));

export const careerRiskRequestSchema = z.object({
  jobTitle: z.string().trim().min(2).max(120),
  skills: optionalTrimmedString(1500),
  experienceYears: experienceYearsSchema,
  industry: optionalTrimmedString(120),
  country: optionalTrimmedString(120),
  location: optionalTrimmedString(200),
  education: optionalTrimmedString(200),
  targetRole: optionalTrimmedString(120),
  careerGoal: optionalTrimmedString(200),
  languages: optionalTrimmedString(300),
  responsibilities: optionalTrimmedString(2000),
  locale: z.enum(CAREER_RISK_LOCALES).optional().default("en"),
});

export type CareerRiskRequest = z.infer<typeof careerRiskRequestSchema>;

/* ------------------------------------------------------------------ */
/*  AI output schema (strict)                                          */
/* ------------------------------------------------------------------ */

const score0to100 = z.coerce.number().min(0).max(100);

export const careerRiskAiOutputSchema = z.object({
  jobTitle: z.string().min(1).max(120).optional(),
  riskScore: score0to100,
  riskLevel: z.enum(CAREER_RISK_LEVELS).optional(),
  summary: z.string().min(10).max(2500),
  reasons: z.array(z.string().min(1).max(400)).min(1).max(10),
  skillsToBuild: z.array(z.string().min(1).max(200)).min(1).max(12),
  alternatives: z.array(z.string().min(1).max(200)).max(10).default([]),
  subScores: z.object({
    taskAutomation: score0to100,
    toolMaturity: score0to100,
    marketAdoption: score0to100,
    agenticExposure: score0to100,
  }),
  timeHorizon: z.string().min(1).max(40),
  confidence: score0to100,
  industryOutlook: z.string().max(500).optional(),
});

export type CareerRiskAiOutput = z.infer<typeof careerRiskAiOutputSchema>;

/* ------------------------------------------------------------------ */
/*  Disclaimers                                                        */
/* ------------------------------------------------------------------ */

export const CAREER_RISK_DISCLAIMER_EN =
  "This is an AI-powered estimate based on the information you provided. It is not a definitive prediction of your career future.";

export const CAREER_RISK_DISCLAIMER_FA =
  "این ارزیابی یک برآورد مبتنی بر داده و هوش مصنوعی است و پیش‌بینی قطعی آینده شغلی محسوب نمی‌شود.";

/* ------------------------------------------------------------------ */
/*  Optional: disclaimer map for all supported locales                 */
/* ------------------------------------------------------------------ */

export const CAREER_RISK_DISCLAIMERS: Record<CareerRiskLocale, string> = {
  en: CAREER_RISK_DISCLAIMER_EN,
  fa: CAREER_RISK_DISCLAIMER_FA,
  ar: "هذا تقدير مدعوم بالذكاء الاصطناعي بناءً على المعلومات التي قدمتها، وليس تنبؤًا نهائيًا بمستقبلك المهني.",
  es: "Esta es una estimación generada por IA basada en la información que proporcionaste. No es una predicción definitiva sobre tu futuro profesional.",
  fr: "Il s'agit d'une estimation générée par IA à partir des informations que vous avez fournies. Ce n'est pas une prédiction définitive de votre avenir professionnel.",
  hi: "यह आपके द्वारा दी गई जानकारी के आधार पर AI-संचालित अनुमान है। यह आपके करियर भविष्य की निश्चित भविष्यवाणी नहीं है।",
  de: "Dies ist eine KI-gestützte Schätzung auf Basis der von Ihnen bereitgestellten Informationen. Sie ist keine definitive Vorhersage Ihrer beruflichen Zukunft.",
};
