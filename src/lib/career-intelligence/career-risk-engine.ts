/**
 * Career Risk heuristic engine — Phase 2.
 *
 * Uses the normalized profile, narrative composer, and achievement
 * extractor so the offline output reads as if written by a human
 * analyst, not generated from a fixed template.
 *
 * This module is pure and deterministic:
 *  - Same input → same output.
 *  - No network calls.
 *  - No randomness beyond a stable hash used for variant selection.
 *
 * Never fabricates facts: metrics, employers, titles, degrees, and
 * certifications come only from the caller's input.
 */
import type {
  CareerRiskAnalysis,
  CareerRiskLocale,
  CareerRiskSubScores,
} from "@/types/career-risk";
import {
  clampScore,
  scoreToRiskLevel,
  compositeFromSubScores,
  languageNameForPrompt,
} from "@/lib/career-risk";
import {
  buildCareerProfile,
  highAutomationTasks,
  resilientTasks,
  taskAutomationExposure,
  humanMoatScore,
  taskLabel,
  toolMaturityFromProfile,
} from "@/lib/career-intelligence/profile";
import {
  normalizeCareerProfile,
  type ExtendedProfileInput,
  type NormalizedCareerProfile,
} from "@/lib/career-intelligence/normalize-profile";
import {
  openingClause,
  reasonAutomation,
  reasonResilience,
  formatYears,
  formatSeniority,
  formatPlace,
  disclaimerLine,
  uniqueSentences,
} from "@/lib/career-intelligence/narrative";
import { extractAchievements } from "@/lib/career-intelligence/achievement-extractor";

/* ------------------------------------------------------------------ */
/* Input / output                                                    */
/* ------------------------------------------------------------------ */

export type CareerRiskEngineInput = ExtendedProfileInput & {
  jobTitle: string;
  skills?: string;
};

/* ------------------------------------------------------------------ */
/* Sub-score computation                                              */
/* ------------------------------------------------------------------ */

function computeSubScores(
  profile: NormalizedCareerProfile,
): CareerRiskSubScores {
  const auto = taskAutomationExposure(profile);
  const moat = humanMoatScore(profile);

  let taskAutomation = auto;
  let toolMaturity = toolMaturityFromProfile(profile);
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

  return {
    taskAutomation: clampScore(taskAutomation),
    toolMaturity: clampScore(toolMaturity),
    marketAdoption: clampScore(marketAdoption),
    agenticExposure: clampScore(agenticExposure),
  };
}

/* ------------------------------------------------------------------ */
/* Reason building                                                    */
/* ------------------------------------------------------------------ */

function buildReasons(
  profile: NormalizedCareerProfile,
  locale: CareerRiskLocale,
): string[] {
  const exposed = highAutomationTasks(profile);
  const resilient = resilientTasks(profile);
  const reasons: string[] = [];

  // Automation exposure — top 2 tasks.
  for (const task of exposed.slice(0, 2)) {
    const label = taskLabel(task, locale);
    reasons.push(
      reasonAutomation(locale, { label, pct: task.automation }),
    );
  }

  // Resilience — top 2 tasks.
  for (const task of resilient.slice(0, 2)) {
    const label = taskLabel(task, locale);
    reasons.push(
      reasonResilience(locale, { label, judgment: task.judgment }),
    );
  }

  // Years + seniority — natural sentence.
  if (profile.yearsExperience != null) {
    const yrs = formatYears(locale, profile.yearsExperience);
    const sen = formatSeniority(locale, profile.seniority);
    reasons.push(yearsSentence(locale, yrs, sen));
  }

  // Transferable evidence — only when achievements exist.
  if (profile.evidence.achievements.length > 0) {
    reasons.push(evidenceSentence(locale, profile.evidence.achievements.length));
  }

  // Career transition — only when present.
  if (profile.transition) {
    const t = profile.transition;
    reasons.push(
      transitionSentence(locale, {
        from: t.fromRole,
        to: t.toRole || "",
        bridges: t.bridgeSkills.slice(0, 3),
        gaps: t.gapSkills.slice(0, 3),
      }),
    );
  }

  // Uncertainty — only when present.
  if (profile.uncertainty.length > 0) {
    reasons.push(uncertaintySentence(locale, profile.uncertainty.length));
  }

  // Ensure at least 3 reasons.
  let fallbackIdx = 0;
  while (reasons.length < 3 && fallbackIdx < 3) {
    reasons.push(fallbackSentence(locale, profile.currentRole));
    fallbackIdx++;
  }

  return uniqueSentences(reasons).slice(0, 8);
}

/* ------------------------------------------------------------------ */
/* Localized reason helpers (fallback when narrative lacks a shape)   */
/* ------------------------------------------------------------------ */

function yearsSentence(
  locale: CareerRiskLocale,
  years: string,
  seniority: string,
): string {
  const t: Record<CareerRiskLocale, string> = {
    en: `With ${years}, your profile sits at ${seniority} level — the balance between automation and judgment reflects that.`,
    fa: `با ${years}، پروفایل شما در سطح ${seniority} قرار دارد — تعادل بین اتوماسیون و قضاوت همین را نشان می‌دهد.`,
    ar: `مع ${years}، يقع ملفك في مستوى ${seniority} — وتوازن الأتمتة والحكم يعكس ذلك.`,
    es: `Con ${years}, tu perfil está en nivel ${seniority}; el equilibrio entre automatización y juicio lo refleja.`,
    fr: `Avec ${years}, votre profil se situe au niveau ${seniority} ; l'équilibre automatisation/jugement le reflète.`,
    de: `Mit ${years} liegt Ihr Profil auf Niveau ${seniority} — die Balance zwischen Automatisierung und Urteil spiegelt das wider.`,
    hi: `${years} के साथ, आपकी प्रोफ़ाइल ${seniority} स्तर पर है — स्वचालन और निर्णय का संतुलन इसे दर्शाता है।`,
  };
  return t[locale] || t.en;
}

function evidenceSentence(locale: CareerRiskLocale, count: number): string {
  const t: Record<CareerRiskLocale, string> = {
    en: `You supplied ${count} concrete evidence point${count === 1 ? "" : "s"} that we used to weight judgment-heavy tasks more favorably.`,
    fa: `شما ${count} شاهد مشخص ارائه کرده‌اید که در وزن‌دهی مثبت‌تر به وظایف قضاوت‌محور استفاده شد.`,
    ar: `قدّمت ${count} دليل ملموس استُخدم لترجيح المهام المعتمدة على الحكم.`,
    es: `Aportaste ${count} evidencia(s) concreta(s) que usamos para ponderar favorablemente las tareas de juicio.`,
    fr: `Vous avez fourni ${count} élément(s) de preuve concret(s) utilisé(s) pour pondérer favorablement les tâches de jugement.`,
    de: `Sie haben ${count} konkrete Belege geliefert, die wir zur stärkeren Gewichtung urteilsintensiver Aufgaben genutzt haben.`,
    hi: `आपने ${count} ठोस प्रमाण दिए जिन्हें निर्णय-केंद्रित कार्यों को अधिक महत्व देने में उपयोग किया गया।`,
  };
  return t[locale] || t.en;
}

function transitionSentence(
  locale: CareerRiskLocale,
  p: { from: string; to: string; bridges: string[]; gaps: string[] },
): string {
  const sep = locale === "fa" || locale === "ar" ? "، " : ", ";
  const bridges = p.bridges.join(sep) || "—";
  const gaps = p.gaps.join(sep) || "—";
  const t: Record<CareerRiskLocale, string> = {
    en: `Moving from «${p.from}» to «${p.to}»: your transferable skills (${bridges}) are usable, but the gaps (${gaps}) should drive a 90-day plan.`,
    fa: `انتقال از «${p.from}» به «${p.to}»: مهارت‌های قابل انتقال (${bridges}) قابل استفاده‌اند، اما شکاف‌ها (${gaps}) باید اولویت نقشه ۹۰روزه باشند.`,
    ar: `الانتقال من «${p.from}» إلى «${p.to}»: المهارات القابلة للنقل (${bridges}) قابلة للاستخدام، لكن الفجوات (${gaps}) يجب أن تقود خطة الـ90 يومًا.`,
    es: `De «${p.from}» a «${p.to}»: las habilidades transferibles (${bridges}) son útiles, pero las brechas (${gaps}) deben guiar un plan de 90 días.`,
    fr: `De «${p.from}» à «${p.to}» : les compétences transférables (${bridges}) sont utiles, mais les écarts (${gaps}) doivent guider un plan de 90 jours.`,
    de: `Von „${p.from}“ zu „${p.to}“: Übertragbare Fähigkeiten (${bridges}) sind nutzbar, aber die Lücken (${gaps}) sollten einen 90-Tage-Plan steuern.`,
    hi: `«${p.from}» से «${p.to}» तक: हस्तांतरणीय कौशल (${bridges}) उपयोगी हैं, लेकिन अंतराल (${gaps}) को 90-दिन की योजना का आधार बनाना चाहिए।`,
  };
  return t[locale] || t.en;
}

function uncertaintySentence(locale: CareerRiskLocale, count: number): string {
  const t: Record<CareerRiskLocale, string> = {
    en: `${count} field${count === 1 ? "" : "s"} are missing — the analysis stays conservative and flags this rather than inventing values.`,
    fa: `${count} مورد اطلاعاتی ناقص است — تحلیل محافظه‌کارانه می‌ماند و به‌جای ساختن مقادیر، این را علامت می‌زند.`,
    ar: `${count} حقل مفقود — يبقى التحليل متحفظًا ويشير إلى ذلك بدلاً من اختلاق قيم.`,
    es: `Faltan ${count} campo(s): el análisis se mantiene conservador y lo señala en lugar de inventar valores.`,
    fr: `${count} champ(s) manquant(s) : l'analyse reste prudente et le signale au lieu d'inventer des valeurs.`,
    de: `${count} Feld(er) fehlen — die Analyse bleibt konservativ und weist darauf hin, statt Werte zu erfinden.`,
    hi: `${count} फ़ील्ड अनुपलब्ध हैं — विश्लेषण सतर्क रहता है और मान बनाने के बजाय इसे इंगित करता है।`,
  };
  return t[locale] || t.en;
}

function fallbackSentence(locale: CareerRiskLocale, role: string): string {
  const t: Record<CareerRiskLocale, string> = {
    en: `Add skills, experience, and responsibilities to your «${role}» profile to sharpen this offline estimate.`,
    fa: `برای دقیق‌تر شدن این تخمین آفلاین، مهارت، تجربه و مسئولیت‌ها را به پروفایل «${role}» اضافه کنید.`,
    ar: `أضف المهارات والخبرة والمسؤوليات إلى ملف «${role}» لتحسين هذا التقدير.`,
    es: `Añade habilidades, experiencia y responsabilidades a tu perfil de «${role}» para afinar esta estimación.`,
    fr: `Ajoutez compétences, expérience et responsabilités à votre profil «${role}» pour affiner cette estimation.`,
    de: `Ergänzen Sie Skills, Erfahrung und Verantwortlichkeiten in Ihrem „${role}“-Profil, um diese Schätzung zu schärfen.`,
    hi: `इस अनुमान को सटीक बनाने के लिए «${role}» प्रोफ़ाइल में कौशल, अनुभव और ज़िम्मेदारियाँ जोड़ें।`,
  };
  return t[locale] || t.en;
}

/* ------------------------------------------------------------------ */
/* Summary building                                                   */
/* ------------------------------------------------------------------ */

function buildSummary(
  profile: NormalizedCareerProfile,
  locale: CareerRiskLocale,
  score: number,
  seed: string,
): string {
  const place = formatPlace(locale, [profile.location, profile.country]);
  const open = openingClause(locale, {
    currentRole: profile.currentRole,
    seniority: profile.seniority,
  }, seed);

  const parts: string[] = [open];
  if (place) parts.push(summaryPlaceSentence(locale, place));

  const top = highAutomationTasks(profile)[0];
  if (top) {
    const label = taskLabel(top, locale);
    parts.push(summaryExposureSentence(locale, label, top.automation));
  }

  const resil = resilientTasks(profile)[0];
  if (resil) {
    const label = taskLabel(resil, locale);
    parts.push(summaryResilienceSentence(locale, label));
  }

  parts.push(summaryScoreSentence(locale, score));
  parts.push(disclaimerLine(locale));

  return parts.join(" ").slice(0, 2500);
}

function summaryPlaceSentence(locale: CareerRiskLocale, place: string): string {
  const t: Record<CareerRiskLocale, string> = {
    en: `Based in ${place},`,
    fa: `مستقر در ${place}،`,
    ar: `مقيم في ${place}،`,
    es: `Con base en ${place},`,
    fr: `Basé à ${place},`,
    de: `Mit Standort in ${place}`,
    hi: `${place} में स्थित,`,
  };
  return t[locale] || t.en;
}

function summaryExposureSentence(
  locale: CareerRiskLocale,
  label: string,
  pct: number,
): string {
  const t: Record<CareerRiskLocale, string> = {
    en: `automation pressure concentrates on «${label}» (~${pct}%).`,
    fa: `فشار اتوماسیون بیشتر روی «${label}» متمرکز است (حدود ${pct}٪).`,
    ar: `يتركز ضغط الأتمتة على «${label}» (~${pct}%).`,
    es: `la presión de automatización se concentra en «${label}» (~${pct}%).`,
    fr: `la pression d'automatisation se concentre sur «${label}» (~${pct}%).`,
    de: `Automatisierungsdruck konzentriert sich auf „${label}“ (~${pct}%).`,
    hi: `स्वचालन दबाव «${label}» पर केंद्रित है (~${pct}%).`,
  };
  return t[locale] || t.en;
}

function summaryResilienceSentence(
  locale: CareerRiskLocale,
  label: string,
): string {
  const t: Record<CareerRiskLocale, string> = {
    en: `Resilience holds in «${label}».`,
    fa: `مقاومت در «${label}» حفظ می‌شود.`,
    ar: `تستمر المرونة في «${label}».`,
    es: `La resiliencia se mantiene en «${label}».`,
    fr: `La résilience tient dans «${label}».`,
    de: `Resilienz hält sich bei „${label}“.`,
    hi: `«${label}» में लचीलापन बना रहता है।`,
  };
  return t[locale] || t.en;
}

function summaryScoreSentence(locale: CareerRiskLocale, score: number): string {
  const t: Record<CareerRiskLocale, string> = {
    en: `Composite score ${score}/100 comes from a task/tool/judgment model — not a fixed template.`,
    fa: `امتیاز ترکیبی ${score}/100 از مدل وظیفه/ابزار/قضاوت می‌آید — نه یک الگوی ثابت.`,
    ar: `الدرجة المركبة ${score}/100 ناتجة عن نموذج المهام/الأدوات/الحكم — لا قالب ثابت.`,
    es: `La puntuación compuesta ${score}/100 proviene de un modelo tarea/herramienta/juicio, no de una plantilla fija.`,
    fr: `Le score composite ${score}/100 provient d'un modèle tâche/outil/jugement, pas d'un modèle figé.`,
    de: `Der Gesamtwert ${score}/100 stammt aus einem Aufgaben-/Tool-/Urteilsmodell — keine feste Vorlage.`,
    hi: `संयुक्त स्कोर ${score}/100 कार्य/टूल/निर्णय मॉडल से आता है — निश्चित टेम्पलेट से नहीं।`,
  };
  return t[locale] || t.en;
}

/* ------------------------------------------------------------------ */
/* Alternatives builder                                               */
/* ------------------------------------------------------------------ */

function buildAlternatives(
  profile: NormalizedCareerProfile,
  locale: CareerRiskLocale,
): string[] {
  const title = profile.currentRole;
  const family = profile.roleFamily;

  const tables: Record<string, Record<CareerRiskLocale, string[]>> = {
    software_engineering: {
      en: [`Senior ${title} with system ownership`, "Platform / reliability engineering", "Technical product specialist"],
      fa: [`${title} ارشد با مالکیت سیستم`, "مهندسی پلتفرم / قابلیت اطمینان", "متخصص محصول فنی"],
      ar: [`${title} أول مع ملكية النظام`, "هندسة المنصات / الموثوقية", "أخصائي منتج تقني"],
      es: [`${title} senior con ownership de sistema`, "Ingeniería de plataforma / fiabilidad", "Especialista de producto técnico"],
      fr: [`${title} senior avec ownership système`, "Ingénierie plateforme / fiabilité", "Spécialiste produit technique"],
      de: [`Senior-${title} mit Systemverantwortung`, "Platform-/Reliability-Engineering", "Technischer Produktspezialist"],
      hi: [`सिस्टम ओनरशिप वाला सीनियर ${title}`, "प्लेटफ़ॉर्म / विश्वसनीयता इंजीनियरिंग", "तकनीकी उत्पाद विशेषज्ञ"],
    },
    data: {
      en: ["Analytics engineering", "ML platform engineering", "Data product owner"],
      fa: ["مهندسی تحلیل داده", "مهندسی پلتفرم ML", "مالک محصول داده"],
      ar: ["هندسة التحليلات", "هندسة منصات التعلم الآلي", "مالك منتج البيانات"],
      es: ["Ingeniería de analítica", "Ingeniería de plataformas ML", "Product owner de datos"],
      fr: ["Ingénierie analytique", "Ingénierie plateformes ML", "Product owner data"],
      de: ["Analytics-Engineering", "ML-Plattform-Engineering", "Data Product Owner"],
      hi: ["एनालिटिक्स इंजीनियरिंग", "ML प्लेटफ़ॉर्म इंजीनियरिंग", "डेटा प्रोडक्ट ओनर"],
    },
    design: {
      en: ["Design systems lead", "UX research specialist", "Product design manager"],
      fa: ["سرپرست سیستم‌های طراحی", "متخصص پژوهش UX", "مدیر طراحی محصول"],
      ar: ["قائد أنظمة التصميم", "أخصائي أبحاث تجربة المستخدم", "مدير تصميم المنتج"],
      es: ["Líder de sistemas de diseño", "Especialista en investigación UX", "Manager de diseño de producto"],
      fr: ["Lead design systems", "Spécialiste recherche UX", "Manager design produit"],
      de: ["Design-Systems-Lead", "UX-Research-Spezialist", "Product-Design-Manager"],
      hi: ["डिज़ाइन सिस्टम लीड", "UX रिसर्च विशेषज्ञ", "प्रोडक्ट डिज़ाइन मैनेजर"],
    },
    education: {
      en: ["Curriculum / learning design", "Assessment specialist", "EdTech facilitation"],
      fa: ["طراحی برنامه درسی / یادگیری", "متخصص سنجش", "تسهیل‌گری EdTech"],
      ar: ["تصميم المناهج / التعلم", "أخصائي تقييم", "تيسير تقنيات التعليم"],
      es: ["Diseño curricular / aprendizaje", "Especialista en evaluación", "Facilitación EdTech"],
      fr: ["Conception pédagogique", "Spécialiste de l'évaluation", "Facilitation EdTech"],
      de: ["Lehrplan-/Lerndesign", "Assessment-Spezialist", "EdTech-Moderation"],
      hi: ["पाठ्यक्रम / अधिगम डिज़ाइन", "मूल्यांकन विशेषज्ञ", "EdTech सुविधा"],
    },
    healthcare: {
      en: ["Specialist clinical pathway", "Care coordination", "Clinical education"],
      fa: ["مسیر بالینی تخصصی", "هماهنگی مراقبت", "آموزش بالینی"],
      ar: ["مسار سريري متخصص", "تنسيق الرعاية", "التعليم السريري"],
      es: ["Vía clínica especializada", "Coordinación de cuidados", "Educación clínica"],
      fr: ["Parcours clinique spécialisé", "Coordination des soins", "Éducation clinique"],
      de: ["Spezialisierte klinische Laufbahn", "Versorgungskoordination", "Klinische Fortbildung"],
      hi: ["विशेष क्लिनिकल मार्ग", "केयर समन्वय", "क्लिनिकल शिक्षा"],
    },
    accounting_finance: {
      en: ["FP&A / management accounting", "Controls and compliance analyst", "Finance systems specialist"],
      fa: ["حسابداری مدیریت / FP&A", "تحلیلگر کنترل و انطباق", "متخصص سیستم‌های مالی"],
      ar: ["المحاسبة الإدارية / FP&A", "محلل الرقابة والامتثال", "أخصائي أنظمة مالية"],
      es: ["FP&A / contabilidad de gestión", "Analista de controles y compliance", "Especialista en sistemas financieros"],
      fr: ["FP&A / contrôle de gestion", "Analyste contrôles et conformité", "Spécialiste systèmes finance"],
      de: ["FP&A / Management Accounting", "Controls- und Compliance-Analyst", "Finanzsystem-Spezialist"],
      hi: ["FP&A / प्रबंधन लेखांकन", "नियंत्रण और अनुपालन विश्लेषक", "वित्त सिस्टम विशेषज्ञ"],
    },
    trades: {
      en: ["Site supervisor", "Specialty certification path", "Independent contractor"],
      fa: ["سرپرست کارگاه", "مسیر گواهی تخصصی", "پیمانکار مستقل"],
      ar: ["مشرف موقع", "مسار شهادة تخصصية", "مقاول مستقل"],
      es: ["Supervisor de obra", "Ruta de certificación especializada", "Contratista independiente"],
      fr: ["Chef de chantier", "Parcours de certification spécialisée", "Entrepreneur indépendant"],
      de: ["Bauleiter", "Spezialisierungs-Zertifizierung", "Selbstständiger Auftragnehmer"],
      hi: ["साइट सुपरवाइज़र", "विशेष प्रमाणन मार्ग", "स्वतंत्र ठेकेदार"],
    },
    management: {
      en: ["Program leadership", "Operational excellence", "People & culture leadership"],
      fa: ["رهبری برنامه", "تعالی عملیاتی", "رهبری افراد و فرهنگ"],
      ar: ["قيادة البرامج", "التميز التشغيلي", "قيادة الأفراد والثقافة"],
      es: ["Liderazgo de programas", "Excelencia operativa", "Liderazgo de personas y cultura"],
      fr: ["Direction de programme", "Excellence opérationnelle", "Direction des personnes et de la culture"],
      de: ["Programmleitung", "Operative Exzellenz", "People- & Culture-Leadership"],
      hi: ["प्रोग्राम लीडरशिप", "ऑपरेशनल उत्कृष्टता", "लोग और संस्कृति नेतृत्व"],
    },
    sales_marketing: {
      en: ["Key account management", "Growth / performance marketing", "Content & brand strategy"],
      fa: ["مدیریت مشتریان کلیدی", "بازاریابی رشد / عملکردی", "استراتژی محتوا و برند"],
      ar: ["إدارة العملاء الرئيسيين", "تسويق النمو / الأداء", "استراتيجية المحتوى والعلامة"],
      es: ["Gestión de cuentas clave", "Marketing de crecimiento / rendimiento", "Estrategia de contenido y marca"],
      fr: ["Gestion de comptes clés", "Marketing de croissance / performance", "Stratégie contenu et marque"],
      de: ["Key-Account-Management", "Growth-/Performance-Marketing", "Content- & Markenstrategie"],
      hi: ["की-अकाउंट प्रबंधन", "ग्रोथ / परफॉर्मेंस मार्केटिंग", "कंटेंट और ब्रांड रणनीति"],
    },
    operations_clerical: {
      en: ["Process excellence", "No-code automation specialist", "Customer operations lead"],
      fa: ["تعالی فرایند", "متخصص اتوماسیون بدون کد", "سرپرست عملیات مشتری"],
      ar: ["تميز العمليات", "أخصائي الأتمتة بدون كود", "قائد عمليات العملاء"],
      es: ["Excelencia de procesos", "Especialista en automatización no-code", "Líder de operaciones de cliente"],
      fr: ["Excellence des processus", "Spécialiste automatisation no-code", "Responsable opérations client"],
      de: ["Prozessexzellenz", "No-Code-Automatisierungsspezialist", "Customer-Operations-Lead"],
      hi: ["प्रक्रिया उत्कृष्टता", "नो-कोड स्वचालन विशेषज्ञ", "कस्टमर ऑपरेशन्स लीड"],
    },
    generic: {
      en: [`Advanced ${title} specialist`, "Cross-functional coordination roles", "Domain training and quality roles"],
      fa: [`متخصص پیشرفته ${title}`, "نقش‌های هماهنگی بین‌تیمی", "نقش‌های آموزش و کیفیت حوزه"],
      ar: [`أخصائي ${title} متقدم`, "أدوار تنسيق عبر الفرق", "أدوار تدريب وجودة المجال"],
      es: [`Especialista avanzado en ${title}`, "Roles de coordinación transversal", "Roles de formación y calidad"],
      fr: [`Spécialiste ${title} avancé`, "Rôles de coordination transverse", "Formation et qualité métier"],
      de: [`Fortgeschrittener ${title}-Spezialist`, "Übergreifende Koordinationsrollen", "Domain-Training und Qualität"],
      hi: [`उन्नत ${title} विशेषज्ञ`, "क्रॉस-फंक्शनल समन्वय भूमिकाएँ", "डोमेन प्रशिक्षण और गुणवत्ता"],
    },
  };

  const pack = tables[family] || tables.generic;
  return pack[locale] || pack.en;
}

/* ------------------------------------------------------------------ */
/* Skills to build                                                    */
/* ------------------------------------------------------------------ */

function buildSkillsToBuild(
  profile: NormalizedCareerProfile,
  locale: CareerRiskLocale,
): string[] {
  // Prefer computed missing skills from target analysis.
  if (profile.missingSkills.length > 0) {
    return profile.missingSkills.slice(0, 8);
  }

  // Fallback: family-based growth skills, localized.
  const tables: Record<string, Record<CareerRiskLocale, string[]>> = {
    software_engineering: {
      en: ["System design", "AI-assisted workflows", "Observability", "Domain modeling", "Technical writing"],
      fa: ["طراحی سیستم", "جریان‌های کاری با کمک AI", "قابلیت مشاهده‌پذیری", "مدل‌سازی دامنه", "نوشتن فنی"],
      ar: ["تصميم الأنظمة", "سير عمل بمساعدة الذكاء الاصطناعي", "المراقبة", "نمذجة المجال", "الكتابة التقنية"],
      es: ["Diseño de sistemas", "Flujos asistidos por IA", "Observabilidad", "Modelado de dominio", "Escritura técnica"],
      fr: ["Conception système", "Flux assistés par IA", "Observabilité", "Modélisation métier", "Rédaction technique"],
      de: ["Systemdesign", "KI-gestützte Workflows", "Observability", "Domain-Modellierung", "Technisches Schreiben"],
      hi: ["सिस्टम डिज़ाइन", "AI-सहायित वर्कफ़्लो", "ऑब्ज़र्वेबिलिटी", "डोमेन मॉडलिंग", "तकनीकी लेखन"],
    },
    data: {
      en: ["Experiment design", "Data storytelling", "Pipeline reliability", "SQL depth", "Model monitoring"],
      fa: ["طراحی آزمایش", "روایت‌گری داده", "قابلیت اطمینان پایپ‌لاین", "تسلط بر SQL", "پایش مدل"],
      ar: ["تصميم التجارب", "سرد البيانات", "موثوقية خطوط الأنابيب", "عمق SQL", "مراقبة النموذج"],
      es: ["Diseño de experimentos", "Storytelling de datos", "Fiabilidad de pipelines", "Profundidad SQL", "Monitoreo de modelos"],
      fr: ["Conception d'expériences", "Storytelling de données", "Fiabilité des pipelines", "Maîtrise SQL", "Suivi des modèles"],
      de: ["Experimentdesign", "Data Storytelling", "Pipeline-Zuverlässigkeit", "SQL-Tiefe", "Modell-Monitoring"],
      hi: ["प्रयोग डिज़ाइन", "डेटा स्टोरीटेलिंग", "पाइपलाइन विश्वसनीयता", "SQL गहराई", "मॉडल निगरानी"],
    },
    design: {
      en: ["UX research synthesis", "Design systems", "Prototyping", "Accessibility", "Stakeholder critique"],
      fa: ["ترکیب پژوهش UX", "سیستم‌های طراحی", "نمونه‌سازی", "دسترس‌پذیری", "نقد ذی‌نفعان"],
      ar: ["تركيب أبحاث UX", "أنظمة التصميم", "النماذج الأولية", "إمكانية الوصول", "نقد أصحاب المصلحة"],
      es: ["Síntesis de investigación UX", "Sistemas de diseño", "Prototipado", "Accesibilidad", "Crítica con stakeholders"],
      fr: ["Synthèse recherche UX", "Design systems", "Prototypage", "Accessibilité", "Critique parties prenantes"],
      de: ["UX-Research-Synthese", "Design-Systems", "Prototyping", "Barrierefreiheit", "Stakeholder-Kritik"],
      hi: ["UX रिसर्च संश्लेषण", "डिज़ाइन सिस्टम", "प्रोटोटाइपिंग", "सुलभता", "हितधारक समीक्षा"],
    },
    education: {
      en: ["Differentiated instruction", "Assessment literacy", "EdTech facilitation", "Parent communication", "Classroom analytics"],
      fa: ["آموزش متمایز", "سواد سنجش", "تسهیل‌گری EdTech", "ارتباط با والدین", "تحلیل کلاس"],
      ar: ["التعليم المتمايز", "ثقافة التقييم", "تيسير تقنيات التعليم", "التواصل مع الوالدين", "تحليلات الفصل"],
      es: ["Instrucción diferenciada", "Alfabetización en evaluación", "Facilitación EdTech", "Comunicación con padres", "Analítica de aula"],
      fr: ["Pédagogie différenciée", "Littératie d'évaluation", "Facilitation EdTech", "Communication parents", "Analytique de classe"],
      de: ["Differenzierter Unterricht", "Assessment-Kompetenz", "EdTech-Moderation", "Elternkommunikation", "Klassenraum-Analytik"],
      hi: ["विभेदित शिक्षण", "मूल्यांकन साक्षरता", "EdTech सुविधा", "अभिभावक संचार", "कक्षा विश्लेषण"],
    },
    healthcare: {
      en: ["Clinical documentation", "Interdisciplinary coordination", "Patient education", "Protocol judgment", "Digital health literacy"],
      fa: ["مستندسازی بالینی", "هماهنگی بین‌رشته‌ای", "آموزش بیمار", "قضاوت پروتکلی", "سواد سلامت دیجیتال"],
      ar: ["التوثيق السريري", "التنسيق بين التخصصات", "تعليم المريض", "الحكم بالبروتوكول", "محو الأمية الصحية الرقمية"],
      es: ["Documentación clínica", "Coordinación interdisciplinaria", "Educación del paciente", "Juicio de protocolo", "Alfabetización en salud digital"],
      fr: ["Documentation clinique", "Coordination interdisciplinaire", "Éducation patient", "Jugement protocolaire", "Littératie santé numérique"],
      de: ["Klinische Dokumentation", "Interdisziplinäre Koordination", "Patientenschulung", "Protokoll-Urteil", "Digitale Gesundheitskompetenz"],
      hi: ["क्लिनिकल दस्तावेज़ीकरण", "अंतर-विषय समन्वय", "रोगी शिक्षा", "प्रोटोकॉल निर्णय", "डिजिटल स्वास्थ्य साक्षरता"],
    },
    accounting_finance: {
      en: ["AI-assisted reporting", "Controls and exception handling", "Advisory storytelling", "FP&A scenario modeling", "Data literacy"],
      fa: ["گزارش‌دهی با کمک AI", "کنترل و مدیریت استثنا", "روایت‌گری مشاوره‌ای", "مدل‌سازی سناریوی FP&A", "سواد داده"],
      ar: ["التقارير بمساعدة الذكاء الاصطناعي", "الرقابة ومعالجة الاستثناءات", "سرد المشورة", "نمذجة سيناريوهات FP&A", "محو الأمية البياناتية"],
      es: ["Reporting asistido por IA", "Controles y manejo de excepciones", "Storytelling de asesoría", "Modelado de escenarios FP&A", "Alfabetización de datos"],
      fr: ["Reporting assisté par IA", "Contrôles et exceptions", "Storytelling de conseil", "Modélisation de scénarios FP&A", "Littératie des données"],
      de: ["KI-gestütztes Reporting", "Controls und Ausnahmen", "Beratungs-Storytelling", "FP&A-Szenario-Modellierung", "Datenkompetenz"],
      hi: ["AI-सहायित रिपोर्टिंग", "नियंत्रण और अपवाद प्रबंधन", "सलाहकार स्टोरीटेलिंग", "FP&A परिदृश्य मॉडलिंग", "डेटा साक्षरता"],
    },
    trades: {
      en: ["Diagnostics methodology", "Safety and code updates", "Digital quoting/CRM", "Customer communication", "Specialty certifications"],
      fa: ["روش‌شناسی عیب‌یابی", "به‌روزرسانی ایمنی و مقررات", "پیشنهاد قیمت دیجیتال / CRM", "ارتباط با مشتری", "گواهی‌های تخصصی"],
      ar: ["منهجية التشخيص", "تحديثات السلامة والكود", "التسعير الرقمي / CRM", "التواصل مع العميل", "شهادات متخصصة"],
      es: ["Metodología de diagnóstico", "Actualizaciones de seguridad y código", "Presupuestos digitales/CRM", "Comunicación con cliente", "Certificaciones especializadas"],
      fr: ["Méthodologie de diagnostic", "Mises à jour sécurité et code", "Devis numérique/CRM", "Communication client", "Certifications spécialisées"],
      de: ["Diagnose-Methodik", "Sicherheits- und Code-Updates", "Digitales Angebot/CRM", "Kundenkommunikation", "Spezialzertifizierungen"],
      hi: ["डायग्नोस्टिक्स पद्धति", "सुरक्षा और कोड अपडेट", "डिजिटल कोटिंग/CRM", "ग्राहक संचार", "विशेष प्रमाणन"],
    },
    operations_clerical: {
      en: ["Process exception handling", "No-code automation", "Customer escalation judgment", "Spreadsheet/BI literacy", "Cross-team coordination"],
      fa: ["مدیریت استثنای فرایند", "اتوماسیون بدون کد", "قضاوت در ارجاع مشتری", "سواد صفحه‌گسترده / BI", "هماهنگی بین‌تیمی"],
      ar: ["معالجة استثناءات العمليات", "الأتمتة بدون كود", "الحكم في تصعيد العملاء", "محو الأمية في الجداول / BI", "التنسيق بين الفرق"],
      es: ["Manejo de excepciones de proceso", "Automatización no-code", "Juicio de escalado de cliente", "Alfabetización hoja de cálculo/BI", "Coordinación transversal"],
      fr: ["Gestion des exceptions de processus", "Automatisation no-code", "Jugement d'escalade client", "Littératie tableur/BI", "Coordination transverse"],
      de: ["Prozess-Ausnahmen", "No-Code-Automatisierung", "Kunden-Eskalations-Urteil", "Tabellen-/BI-Kompetenz", "Teamübergreifende Koordination"],
      hi: ["प्रक्रिया अपवाद प्रबंधन", "नो-कोड स्वचालन", "ग्राहक एस्केलेशन निर्णय", "स्प्रेडशीट/BI साक्षरता", "क्रॉस-टीम समन्वय"],
    },
    sales_marketing: {
      en: ["Consultative selling", "CRM discipline", "Content differentiation", "Pipeline analytics", "Negotiation"],
      fa: ["فروش مشاوره‌ای", "نظم CRM", "تمایز محتوا", "تحلیل قیف فروش", "مذاکره"],
      ar: ["البيع الاستشاري", "انضباط CRM", "تمييز المحتوى", "تحليلات خط الأنابيب", "التفاوض"],
      es: ["Venta consultiva", "Disciplina CRM", "Diferenciación de contenido", "Analítica de pipeline", "Negociación"],
      fr: ["Vente consultative", "Discipline CRM", "Différenciation de contenu", "Analytique pipeline", "Négociation"],
      de: ["Beratender Verkauf", "CRM-Disziplin", "Content-Differenzierung", "Pipeline-Analytik", "Verhandlung"],
      hi: ["परामर्शात्मक बिक्री", "CRM अनुशासन", "कंटेंट विभेदन", "पाइपलाइन एनालिटिक्स", "बातचीत"],
    },
    management: {
      en: ["Coaching conversations", "Prioritization frameworks", "Cross-functional influence", "Hiring signal design", "Operational metrics"],
      fa: ["گفتگوهای کوچینگ", "چارچوب‌های اولویت‌بندی", "نفوذ بین‌تیمی", "طراحی سیگنال استخدام", "معیارهای عملیاتی"],
      ar: ["محادثات التدريب", "أطر تحديد الأولويات", "التأثير عبر الوظائف", "تصميم إشارات التوظيف", "المقاييس التشغيلية"],
      es: ["Conversaciones de coaching", "Marcos de priorización", "Influencia transversal", "Diseño de señales de contratación", "Métricas operativas"],
      fr: ["Conversations de coaching", "Cadres de priorisation", "Influence transverse", "Conception de signaux de recrutement", "Métriques opérationnelles"],
      de: ["Coaching-Gespräche", "Priorisierungs-Frameworks", "Funktionsübergreifender Einfluss", "Hiring-Signal-Design", "Operative Metriken"],
      hi: ["कोचिंग बातचीत", "प्राथमिकता फ्रेमवर्क", "क्रॉस-फंक्शनल प्रभाव", "हायरिंग सिग्नल डिज़ाइन", "ऑपरेशनल मेट्रिक्स"],
    },
    generic: {
      en: ["Domain specialization", "Digital literacy", "Structured problem solving", "Professional communication", "Portfolio evidence"],
      fa: ["تخصص حوزه‌ای", "سواد دیجیتال", "حل مسئله ساخت‌یافته", "ارتباط حرفه‌ای", "شواهد نمونه‌کار"],
      ar: ["التخصص في المجال", "محو الأمية الرقمية", "حل المشكلات المنظم", "التواصل المهني", "أدلة الأعمال"],
      es: ["Especialización de dominio", "Alfabetización digital", "Resolución estructurada de problemas", "Comunicación profesional", "Evidencia de portafolio"],
      fr: ["Spécialisation métier", "Littératie numérique", "Résolution structurée de problèmes", "Communication professionnelle", "Preuves de portfolio"],
      de: ["Fachspezialisierung", "Digitale Kompetenz", "Strukturierte Problemlösung", "Professionelle Kommunikation", "Portfolio-Nachweise"],
      hi: ["डोमेन विशेषज्ञता", "डिजिटल साक्षरता", "संरचित समस्या समाधान", "पेशेवर संचार", "पोर्टफोलियो प्रमाण"],
    },
  };

  const pack = tables[profile.roleFamily] || tables.generic;
  return pack[locale] || pack.en;
}

/* ------------------------------------------------------------------ */
/* Public entry point                                                 */
/* ------------------------------------------------------------------ */

/**
 * Build a CareerRiskAnalysis from a raw profile.
 *
 * Deterministic: same input → same output. No network calls.
 * Never fabricates facts — all localized sentences come from the
 * profile and the narrative layer.
 */
export function runCareerRiskEngine(
  input: CareerRiskEngineInput,
): CareerRiskAnalysis {
  const profile = normalizeCareerProfile(input);
  const locale = profile.locale;

  const subScores = computeSubScores(profile);
  const score = compositeFromSubScores(subScores);

  const seed = `${profile.currentRole}:${profile.seniority}:${profile.yearsExperience ?? "na"}:${locale}`;

  const summary = buildSummary(profile, locale, score, seed);
  const reasons = buildReasons(profile, locale);
  const skillsToBuild = buildSkillsToBuild(profile, locale);
  const alternatives = buildAlternatives(profile, locale);

  const place = formatPlace(locale, [profile.location, profile.country]);

  return {
    jobTitle: profile.currentRole.slice(0, 120),
    riskScore: score,
    riskLevel: scoreToRiskLevel(score),
    summary,
    reasons,
    skillsToBuild,
    alternatives,
    source: "heuristic",
    subScores,
    timeHorizon: locale === "fa" ? "۵–۱۰ سال" : locale === "ar" ? "٥–١٠ سنوات" : locale === "es" ? "5–10 años" : locale === "fr" ? "5–10 ans" : locale === "de" ? "5–10 Jahre" : locale === "hi" ? "5–10 वर्ष" : "5–10 years",
    confidence: Math.min(70, 42 + Math.round(profile.profileCompleteness * 0.28)),
    confidenceSource: "offline_estimate",
    industryOutlook: industryLine(locale, profile.industry || "", place),
  };
}

/* ------------------------------------------------------------------ */
/* Industry outlook line                                              */
/* ------------------------------------------------------------------ */

function industryLine(
  locale: CareerRiskLocale,
  industry: string,
  place: string,
): string {
  const ind = industry.trim() || "—";
  const loc = place.trim() || "—";
  const t: Record<CareerRiskLocale, string> = {
    en: `Industry: ${ind} · Location: ${loc}`,
    es: `Sector: ${ind} · Ubicación: ${loc}`,
    ar: `القطاع: ${ind} · الموقع: ${loc}`,
    fa: `صنعت: ${ind} · مکان: ${loc}`,
    hi: `उद्योग: ${ind} · स्थान: ${loc}`,
    fr: `Secteur : ${ind} · Lieu : ${loc}`,
    de: `Branche: ${ind} · Ort: ${loc}`,
  };
  return t[locale] || t.en;
}

/* ------------------------------------------------------------------ */
/* Unused import guard                                                */
/* ------------------------------------------------------------------ */

// Silence unused imports if tree-shaken downstream.
void buildCareerProfile;
void extractAchievements;
void languageNameForPrompt;
