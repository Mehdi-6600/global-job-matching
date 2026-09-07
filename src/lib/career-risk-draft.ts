import type { CareerRiskFormInput } from "@/types/career-risk";

const STORAGE_KEY = "gjm_career_risk_draft_v2";
const TTL_MS = 2 * 60 * 60 * 1000; // 2 hours

export type CareerRiskDraft = {
  form: CareerRiskFormInput;
  autoSubmit: boolean;
  savedAt: number;
};

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof sessionStorage !== "undefined";
}

export function saveCareerRiskDraft(
  form: CareerRiskFormInput,
  options?: { autoSubmit?: boolean }
): void {
  if (!canUseStorage()) return;
  try {
    const payload: CareerRiskDraft = {
      form: {
        jobTitle: (form.jobTitle || "").trim(),
        skills: form.skills || "",
        industry: form.industry || "",
        experienceYears:
          typeof form.experienceYears === "number" &&
          Number.isFinite(form.experienceYears)
            ? form.experienceYears
            : undefined,
        country: form.country || "",
        location: form.location || "",
        education: form.education || "",
      },
      autoSubmit: Boolean(options?.autoSubmit),
      savedAt: Date.now(),
    };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // quota / private mode
  }
}

export function loadCareerRiskDraft(): CareerRiskDraft | null {
  if (!canUseStorage()) return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CareerRiskDraft;
    if (!parsed?.form || typeof parsed.savedAt !== "number") return null;
    if (Date.now() - parsed.savedAt > TTL_MS) {
      sessionStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearCareerRiskDraft(): void {
  if (!canUseStorage()) return;
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
