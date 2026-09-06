import type { CareerRiskFormInput } from "@/types/career-risk";

const STORAGE_KEY = "gjm_career_risk_draft_v1";
const MAX_AGE_MS = 2 * 60 * 60 * 1000; // 2 hours

type DraftEnvelope = {
  v: 1;
  savedAt: number;
  form: CareerRiskFormInput;
  autoSubmit?: boolean;
};

function canUseSessionStorage(): boolean {
  return typeof window !== "undefined" && typeof sessionStorage !== "undefined";
}

export function saveCareerRiskDraft(
  form: CareerRiskFormInput,
  opts?: { autoSubmit?: boolean }
): void {
  if (!canUseSessionStorage()) return;
  const payload: DraftEnvelope = {
    v: 1,
    savedAt: Date.now(),
    form: {
      jobTitle: String(form.jobTitle || "").slice(0, 120),
      skills: String(form.skills || "").slice(0, 1500),
      industry: String(form.industry || "").slice(0, 120),
      experienceYears:
        typeof form.experienceYears === "number" &&
        Number.isFinite(form.experienceYears)
          ? Math.min(50, Math.max(0, form.experienceYears))
          : undefined,
      country: String(form.country || "").slice(0, 120),
      location: String(form.location || "").slice(0, 200),
      education: String(form.education || "").slice(0, 200),
    },
    autoSubmit: Boolean(opts?.autoSubmit),
  };
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // quota / private mode — ignore
  }
}

export function loadCareerRiskDraft(): {
  form: CareerRiskFormInput;
  autoSubmit: boolean;
} | null {
  if (!canUseSessionStorage()) return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DraftEnvelope;
    if (!parsed || parsed.v !== 1 || !parsed.form?.jobTitle) return null;
    if (Date.now() - (parsed.savedAt || 0) > MAX_AGE_MS) {
      sessionStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return {
      form: parsed.form,
      autoSubmit: Boolean(parsed.autoSubmit),
    };
  } catch {
    return null;
  }
}

export function clearCareerRiskDraft(): void {
  if (!canUseSessionStorage()) return;
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function markCareerRiskDraftAutoSubmit(enabled: boolean): void {
  const current = loadCareerRiskDraft();
  if (!current) return;
  saveCareerRiskDraft(current.form, { autoSubmit: enabled });
}
