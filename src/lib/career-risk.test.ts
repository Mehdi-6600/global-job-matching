import { describe, expect, it } from "vitest";
import {
  compositeFromSubScores,
  heuristicCareerRisk,
  parseRiskJson,
  parseSubScoresStrict,
  reconcileScoreWithSubScores,
  scoreToRiskLevel,
  toSuccessResponse,
} from "@/lib/career-risk";

describe("scoreToRiskLevel", () => {
  it("maps bands deterministically", () => {
    expect(scoreToRiskLevel(0)).toBe("low");
    expect(scoreToRiskLevel(34)).toBe("low");
    expect(scoreToRiskLevel(35)).toBe("medium");
    expect(scoreToRiskLevel(64)).toBe("medium");
    expect(scoreToRiskLevel(65)).toBe("high");
    expect(scoreToRiskLevel(100)).toBe("high");
  });
});

describe("parseSubScoresStrict", () => {
  it("rejects missing fields", () => {
    expect(parseSubScoresStrict({ taskAutomation: 10 })).toBeNull();
  });
  it("rejects out of range", () => {
    expect(
      parseSubScoresStrict({
        taskAutomation: 101,
        toolMaturity: 10,
        marketAdoption: 10,
        agenticExposure: 10,
      })
    ).toBeNull();
  });
  it("accepts valid", () => {
    const s = parseSubScoresStrict({
      taskAutomation: 40,
      toolMaturity: 50,
      marketAdoption: 30,
      agenticExposure: 20,
    });
    expect(s).not.toBeNull();
    expect(s!.taskAutomation).toBe(40);
  });
});

describe("parseRiskJson", () => {
  it("forces user title and level from score", () => {
    const text = JSON.stringify({
      jobTitle: "HACKED TITLE",
      riskScore: 80,
      riskLevel: "low",
      summary:
        "Meaningful summary about automation pressure in this role over time.",
      reasons: ["r1"],
      skillsToBuild: ["s1"],
      alternatives: ["a1"],
      subScores: {
        taskAutomation: 70,
        toolMaturity: 60,
        marketAdoption: 55,
        agenticExposure: 40,
      },
      timeHorizon: "5–10 years",
      confidence: 70,
    });
    const parsed = parseRiskJson(text, "Frontend Developer");
    expect(parsed).not.toBeNull();
    expect(parsed!.jobTitle).toBe("Frontend Developer");
    expect(parsed!.riskLevel).toBe(scoreToRiskLevel(parsed!.riskScore));
    expect(parsed!.source).toBe("ai");
  });

  it("rejects missing subScores", () => {
    const text = JSON.stringify({
      riskScore: 50,
      summary: "A long enough summary text here for validation.",
      reasons: ["r1"],
      skillsToBuild: ["s1"],
      timeHorizon: "5–10 years",
      confidence: 50,
    });
    expect(parseRiskJson(text, "X")).toBeNull();
  });

  it("returns null on garbage", () => {
    expect(parseRiskJson("not json", "X")).toBeNullگذاری
1. `src/lib/ai.ts`  
2. `src/types/career-risk.ts`  
3. `src/lib/career-risk.ts`  
4. `src/app/api/career/risk/route.ts`  
5. `src/lib/job-matching.ts`  
6. `src/lib/career-risk.test.ts`  

بعد Redeploy.

### چه چیزی عوض شد (خلاصه)
| مورد | قبل | بعد |
|------|-----|-----|
| Quota infra fail | ادامه با heuristic | **۵۰۳** بدون AI |
| Quota exceeded | گاهی heuristic ۲۰۰ | **۴۰۳** |
| AI attempts | تا ۵ مدل × retry | حداکثر **۳** |
| subScores ناقص | تبدیل به ۵۰ | **رد AI → heuristic** |
| شهر/کشور | تقریباً نادیده | در summary و reasons |
| معمار / فیزیوتراپ | generic | bucket جدا |

اگر صفحه هنوز `locale` را در body نمی‌فرستد، بگو تا `page.tsx` کامل را هم در پارت بعد بفرستم.
