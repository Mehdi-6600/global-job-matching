import { z } from "zod";

export const CAREER_RISK_LEVELS = ["low", "medium", "high"] as const;
export type CareerRiskLevel = (typeof CAREER_RISK_LEVELS)[number];

export const CAREER_RISK_SOURCES = ["ai", "heuristic"] as const;
export type CareerRiskSource = (typeof CAREER_RISK_SOURCES)[number];

/** 0–100 sub-scores explaining the overall risk */
export type CareerRiskSubScores = {
  /** How much of the role’s core work AI could do end-to-end today */
  taskAutomation: number;
  /** How mature / available tools are for those tasks */
  toolMaturity: number;
  /** How widely employers already use AI for those tasks */
  marketAdoption: number;
  /** Exposure to autonomous agents (not just copilots) */
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
  /** Optional richer fields (always preferred when present) */
  subScores?: CareerRiskSubScores;
  /** e.g. "5–10 years" */
  timeHorizon?: string;
  /** 0–100 confidence in the estimate */
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
  experienceYears: z.number().min(0).max(50).optional(),
  industry: z.string().max(120).optional().or(z.literal("")),
  country: z.string().max(120).optional().or(z.literal("")),
  location: z.string().max(200).optional().or(z.literal("")),
  education: z.string().max(200).optional().or(z.literal("")),
});

export type CareerRiskRequest = z.infer<typeof careerRiskRequestSchema>;

export const CAREER_RISK_DISCLAIMER_EN =
  "This is an AI-powered estimate based on the information you provided. It is not a definitive prediction of your career future.";

export const CAREER_RISK_DISCLAIMER_FA =
  "این ارزیابی یک برآورد مبتنی بر داده و هوش مصنوعی است و پیش‌بینی قطعی آینده شغلی محسوب نمی‌شود.";
