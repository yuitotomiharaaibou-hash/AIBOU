export type PlanningElementKey =
  | "deadlineUrgency"
  | "dailyLoadLimit"
  | "subjectBalance"
  | "lateNightAvoidance"
  | "timeBlockStability"
  | "smallStepPreference"
  | "completionRhythm"
  | "fixedTaskRespect"
  | "replanTolerance"
  | "weekdayWeekendBias";

export type PlannerPreference = {
  version: number;
  learnedAt: string;
  // 要素ごとの重み（0.0 ~ 2.0 目安）
  weights: Record<PlanningElementKey, number>;
  // 行動から推定する制約
  maxTasksPerDay: number;
  avoidAfterHour: number;
  preferredHours: number[]; // 0-23
  subjectBias: {
    english: number;
    math: number;
  };
  acceptedPlans: number;
  rejectedPlans: number;
};

export type PlannerEvent =
  | { kind: "regenerate"; countInSession: number }
  | { kind: "pin"; hour: number; subject: "english" | "math" }
  | { kind: "manual-move"; fromHour: number; toHour: number; subject: "english" | "math" }
  | { kind: "complete"; hour: number; subject: "english" | "math" }
  | { kind: "accept-plan" };

export type PlannerProfileHints = {
  school?: string;
  grade?: string;
  juku?: string;
};

export type SuccessTemplate = {
  id: string;
  label: string;
  weightOverrides: Partial<Record<PlanningElementKey, number>>;
  maxTasksPerDay?: number;
  avoidAfterHour?: number;
  preferredHours?: number[];
  subjectBias?: Partial<{ english: number; math: number }>;
};

export function createDefaultPreference(): PlannerPreference {
  return {
    version: 1,
    learnedAt: new Date().toISOString(),
    weights: {
      deadlineUrgency: 1.4,
      dailyLoadLimit: 1.1,
      subjectBalance: 1.0,
      lateNightAvoidance: 1.3,
      timeBlockStability: 1.0,
      smallStepPreference: 1.0,
      completionRhythm: 1.0,
      fixedTaskRespect: 1.4,
      replanTolerance: 1.0,
      weekdayWeekendBias: 1.0,
    },
    maxTasksPerDay: 5,
    avoidAfterHour: 22,
    preferredHours: [17, 18, 19, 20],
    subjectBias: { english: 1, math: 1 },
    acceptedPlans: 0,
    rejectedPlans: 0,
  };
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function uniqHours(arr: number[]): number[] {
  return Array.from(new Set(arr.map((h) => clamp(Math.round(h), 0, 23)))).sort((a, b) => a - b);
}

function blend(current: number, target: number, alpha: number): number {
  return current * (1 - alpha) + target * alpha;
}

export function getSuccessTemplateByHints(hints: PlannerProfileHints): SuccessTemplate | null {
  const school = hints.school ?? "";
  const grade = hints.grade ?? "";
  const juku = hints.juku ?? "";

  if (school === "開成" && grade === "高2" && juku === "鉄緑会") {
    return {
      id: "kaisei-k2-tetsuryoku",
      label: "開成高2 + 鉄緑会",
      weightOverrides: {
        deadlineUrgency: 1.7,
        dailyLoadLimit: 1.25,
        lateNightAvoidance: 1.4,
        timeBlockStability: 1.2,
        completionRhythm: 1.2,
        fixedTaskRespect: 1.5,
      },
      maxTasksPerDay: 6,
      avoidAfterHour: 23,
      preferredHours: [6, 7, 17, 18, 19, 20, 21],
      subjectBias: { english: 1.03, math: 1.07 },
    };
  }

  if (juku === "鉄緑会") {
    return {
      id: "tetsuryoku-generic",
      label: "鉄緑会ベース",
      weightOverrides: {
        deadlineUrgency: 1.6,
        timeBlockStability: 1.1,
        fixedTaskRespect: 1.45,
      },
      maxTasksPerDay: 6,
      avoidAfterHour: 23,
      preferredHours: [6, 7, 17, 18, 19, 20, 21],
      subjectBias: { english: 1.02, math: 1.05 },
    };
  }
  return null;
}

export function applySuccessTemplate(
  pref: PlannerPreference,
  template: SuccessTemplate,
  alpha = 0.35
): PlannerPreference {
  const next: PlannerPreference = {
    ...pref,
    learnedAt: new Date().toISOString(),
    weights: { ...pref.weights },
    subjectBias: { ...pref.subjectBias },
    preferredHours: [...pref.preferredHours],
  };

  (Object.keys(template.weightOverrides) as PlanningElementKey[]).forEach((k) => {
    const v = template.weightOverrides[k];
    if (typeof v === "number") {
      next.weights[k] = clamp(blend(next.weights[k], v, alpha), 0.4, 2.0);
    }
  });

  if (typeof template.maxTasksPerDay === "number") {
    next.maxTasksPerDay = Math.round(clamp(blend(next.maxTasksPerDay, template.maxTasksPerDay, alpha), 3, 8));
  }
  if (typeof template.avoidAfterHour === "number") {
    next.avoidAfterHour = Math.round(clamp(blend(next.avoidAfterHour, template.avoidAfterHour, alpha), 21, 24));
  }
  if (template.subjectBias?.english) {
    next.subjectBias.english = clamp(blend(next.subjectBias.english, template.subjectBias.english, alpha), 0.7, 1.4);
  }
  if (template.subjectBias?.math) {
    next.subjectBias.math = clamp(blend(next.subjectBias.math, template.subjectBias.math, alpha), 0.7, 1.4);
  }
  if (template.preferredHours && template.preferredHours.length > 0) {
    next.preferredHours = uniqHours([...template.preferredHours, ...next.preferredHours]).slice(0, 8);
  }
  return next;
}

export function learnFromEvent(prev: PlannerPreference, event: PlannerEvent): PlannerPreference {
  const next: PlannerPreference = {
    ...prev,
    weights: { ...prev.weights },
    preferredHours: [...prev.preferredHours],
    subjectBias: { ...prev.subjectBias },
    learnedAt: new Date().toISOString(),
  };

  switch (event.kind) {
    case "regenerate": {
      next.rejectedPlans += 1;
      next.weights.replanTolerance = clamp(next.weights.replanTolerance - 0.04, 0.4, 2.0);
      next.weights.timeBlockStability = clamp(next.weights.timeBlockStability + 0.03, 0.4, 2.0);
      if (event.countInSession >= 2) {
        next.maxTasksPerDay = clamp(next.maxTasksPerDay - 1, 3, 8);
        next.weights.dailyLoadLimit = clamp(next.weights.dailyLoadLimit + 0.05, 0.4, 2.0);
      }
      break;
    }
    case "pin": {
      next.weights.fixedTaskRespect = clamp(next.weights.fixedTaskRespect + 0.05, 0.4, 2.0);
      next.weights.timeBlockStability = clamp(next.weights.timeBlockStability + 0.03, 0.4, 2.0);
      if (event.subject === "english") next.subjectBias.english = clamp(next.subjectBias.english + 0.02, 0.7, 1.4);
      else next.subjectBias.math = clamp(next.subjectBias.math + 0.02, 0.7, 1.4);
      next.preferredHours = uniqHours([event.hour, ...next.preferredHours]).slice(0, 6);
      break;
    }
    case "manual-move": {
      next.weights.timeBlockStability = clamp(next.weights.timeBlockStability + 0.02, 0.4, 2.0);
      next.preferredHours = uniqHours([event.toHour, ...next.preferredHours]).slice(0, 6);
      if (event.toHour >= 22) {
        next.avoidAfterHour = clamp(event.toHour + 1, 21, 24);
      } else if (event.toHour <= 20) {
        next.weights.lateNightAvoidance = clamp(next.weights.lateNightAvoidance + 0.03, 0.4, 2.0);
      }
      break;
    }
    case "complete": {
      next.acceptedPlans += 1;
      next.weights.completionRhythm = clamp(next.weights.completionRhythm + 0.02, 0.4, 2.0);
      next.preferredHours = uniqHours([event.hour, ...next.preferredHours]).slice(0, 6);
      if (event.hour >= 22) {
        next.weights.lateNightAvoidance = clamp(next.weights.lateNightAvoidance - 0.02, 0.4, 2.0);
      } else {
        next.weights.lateNightAvoidance = clamp(next.weights.lateNightAvoidance + 0.01, 0.4, 2.0);
      }
      break;
    }
    case "accept-plan": {
      next.acceptedPlans += 1;
      next.weights.replanTolerance = clamp(next.weights.replanTolerance + 0.04, 0.4, 2.0);
      next.weights.timeBlockStability = clamp(next.weights.timeBlockStability - 0.01, 0.4, 2.0);
      break;
    }
  }

  return next;
}

