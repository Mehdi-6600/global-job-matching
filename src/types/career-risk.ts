import { z } from "zod";

export const CAREER_RISK_LEVELS = ["low", "medium", "high"] as const;
export type CareerRiskLevel = (typeof CAREER_RISK_LEVELS)[number];

export const CAREER_RISK_SOURCES = ["ai", "heuristic"] as const;
export type CareerRiskSource = (typeof CAREER_RISK_SOURCES)[number];

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

export type CareerRiskFormInput = {
  jobTitle: string;
  skills?: string;
  industry?: string;
  experienceYears?: number;
  country?: string;
  location?: string;
  education?: string;
};

export const careerRiskRequestSchema = z.object({
  jobTitle: z.string().trim().min(2).max(120),
  skills: z.string().max(1500).optional().or(z.literal("")),
  // Accept string numbers from mobile forms
  experienceYears: z.preprocess((v) => {
    if (v === "" || v === null || v === undefined) return undefined;
    const n = typeof v === "number" ? v : Number(v);
    return Number.isFinite(n) ? n : undefined;
  }, z.number().min(0).max(50).optional()),
  industry: z.string().max(120).optional().or(z.literal("")),
  country: z.string().max(120).optional().or(z.literal("")),
  location: z.string().max(200).optional().or(z.literal("")),
  education: z.string().max(200).optional().or(z.literal("")),
});

export type CareerRiskRequest = z.infer<typeof careerRiskRequestSchema>;

const score01_100 = z.coerce.number().min(0).max(100);

export const careerRiskAiOutputSchema = z.object({
  jobTitle: z.string().min(1).max(120).optional(),
  riskScore: score01_100,
  riskLevel: z.enum(["low", "medium", "high"]).optional(),
  summary: z.string().min(10).max(2500),
  reasons: z.array(z.string().min(1).max(400)).max(10).default([]),
  skillsToBuild: z.array(z.string().min(1).max(200)).max(12).default([]),
  alternatives: z.array(z.string().min(1).max(200)).max(10).default([]),
  subScores: z
    .object({
      taskAutomation: score01_100,
      toolMaturity: score01_100,
      marketAdoption: score01_100,
      agenticExposure: score01_100,
    })
    .optional(),
  timeHorizon: z.string().max(40).optional(),
  confidence: score01_100.optional(),
  industryOutlook: z.string().max(500).optional(),
});

export type CareerRiskAiOutput = z.infer<typeof careerRiskAiOutputSchema>;

export const CAREER_RISK_DISCLAIMER_EN =
  "This is an AI-powered estimate based on the information you provided. It is not a definitive prediction of your career future.";

export const CAREER_RISK_DISCLAIMER_FA =
  "این ارزیابی یک برآورد مبتنی بر داده و هوش مصنوعی است و پیش‌بینی قطعی آینده شغلی محسوب نمی‌شود.";
