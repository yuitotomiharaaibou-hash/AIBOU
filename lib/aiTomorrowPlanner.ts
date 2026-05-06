import type { Task } from "@/context/TasksContext";
import type { TomorrowHearing } from "@/lib/tomorrowPlan";
import { simpleStorageGet } from "@/lib/simpleStorage";
import { COMPANION_AI_SYSTEM_PROMPT } from "@/lib/companionAiPrompt";
import type { AiTaskAdjustmentPatch } from "@/lib/aiTaskAdjustmentPatch";
import type { AiTaskCreatePatch } from "@/lib/aiTaskCreatePatch";
import { asHomePlanOps, type HomePlanOp } from "@/lib/aiHomePlanOps";
import type { TaskMonthClearSpec } from "@/lib/applyAiTaskBulk";

export type { TaskMonthClearSpec } from "@/lib/applyAiTaskBulk";

type AiHearingInput = {
  tasks: Task[];
  todayKey: string;
  tomorrowKey: string;
  todayBusySlotCount: number;
  fallback: TomorrowHearing;
  qaContext?: string;
  /** プロフィール・昨日/今日タスク・ホーム予定など事実の束（UI非表示） */
  sessionContext?: string;
};

/** 承認画面に載せる4段の具体叙述（因果・だからを短くつなぐ） */
export type CompanionAiChain = {
  execution: string;
  goal: string;
  information: string;
  placement: string;
};

export type AiClarifyQuestion = {
  id: string;
  text: string;
};

export type { AiTaskAdjustmentPatch } from "@/lib/aiTaskAdjustmentPatch";

export type AiTomorrowPlanResult = {
  hearing: TomorrowHearing;
  source: "ai" | "fallback";
  /** 実際に呼び出したモデル（デバッグ表示用） */
  modelUsed?: string;
  reason?: string;
  changeSummary?: string;
  phaseNotes?: string[];
  questions?: AiClarifyQuestion[];
  taskAdjustments?: AiTaskAdjustmentPatch[];
  taskCreates?: AiTaskCreatePatch[];
  companionChain?: CompanionAiChain;
  /** ホーム画面の予定（カレンダー上のブロック）の削除・全日クリア */
  homePlanOps?: HomePlanOp[];
  /** 学習タスクで date がその月のものを一括削除 */
  taskMonthClear?: TaskMonthClearSpec;
  /** 学習タスクを id で削除（一覧の id のみ） */
  taskDeletes?: string[];
  error?: string;
};

export type { HomePlanOp } from "@/lib/aiHomePlanOps";

type AiHearingResult = AiTomorrowPlanResult;

function safeJsonParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function normalizeJsonText(raw: string): string {
  let s = raw.trim().replace(/^\uFEFF/, "");
  const fence = s.match(/```(?:json)?\s*/i);
  if (fence && fence.index !== undefined) {
    s = s.slice(fence.index + fence[0].length);
    const close = s.lastIndexOf("```");
    if (close >= 0) s = s.slice(0, close);
    return s.trim();
  }
  return s;
}

function tryRepairTruncatedTopLevelJson(raw: string): string | null {
  const t = raw.trim().replace(/^\uFEFF/, "");
  const start = t.indexOf("{");
  if (start < 0) return null;
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = start; i < t.length; i++) {
    const c = t[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (inString) {
      if (c === "\\") escape = true;
      else if (c === "\"") inString = false;
      continue;
    }
    if (c === "\"") {
      inString = true;
      continue;
    }
    if (c === "{") depth++;
    else if (c === "}") {
      depth--;
      if (depth === 0) return t.slice(start, i + 1);
    }
  }
  let repaired = t.slice(start);
  repaired = repaired.replace(/,\s*$/, "");
  if (inString) repaired += '"';
  while (depth > 0) {
    repaired += "}";
    depth--;
  }
  return repaired;
}

function salvageHearingObjectFromLooseText(text: string): Record<string, unknown> | null {
  const t = text;
  const busyM = t.match(/"busy"\s*:\s*([012])/);
  const lateM = t.match(/"lateStart"\s*:\s*(true|false)/i);
  const leanM = t.match(/"subjectLean"\s*:\s*"(english|math|balance)"/i);
  const ymM = t.match(/"yearMonth"\s*:\s*"(\d{4}-\d{2})"/);
  const ipM = t.match(/"includePinned"\s*:\s*(true|false)/i);
  const reasonM = t.match(/"reason"\s*:\s*"((?:[^"\\]|\\.)*)/);
  const changeM = t.match(/"changeSummary"\s*:\s*"((?:[^"\\]|\\.)*)/);
  if (!busyM && !ymM && !reasonM) return null;
  const o: Record<string, unknown> = {};
  if (busyM) o.busy = Number(busyM[1]);
  else o.busy = 1;
  if (lateM) o.lateStart = lateM[1].toLowerCase() === "true";
  if (leanM) o.subjectLean = leanM[1].toLowerCase();
  if (ymM) {
    o.task_month_clear = {
      yearMonth: ymM[1],
      includePinned: ipM ? ipM[1].toLowerCase() === "true" : false,
    };
  }
  if (reasonM) o.reason = reasonM[1].replace(/\\"/g, '"').replace(/\\n/g, "\n").slice(0, 520);
  if (changeM) o.changeSummary = changeM[1].replace(/\\"/g, '"').slice(0, 520);
  return o;
}

/**
 * モデルが JSON の前後に説明を付けたり、フェンスが崩れたりしても先頭のオブジェクトを拾う。
 */
function extractLeadingJsonObject(raw: string): string | null {
  const s = raw.trim().replace(/^\uFEFF/, "");
  const start = s.indexOf("{");
  if (start < 0) return null;
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = start; i < s.length; i++) {
    const c = s[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (inString) {
      if (c === "\\") escape = true;
      else if (c === "\"") inString = false;
      continue;
    }
    if (c === "\"") {
      inString = true;
      continue;
    }
    if (c === "{") depth++;
    else if (c === "}") {
      depth--;
      if (depth === 0) return s.slice(start, i + 1);
    }
  }
  return null;
}

/** プロキシ/モデル由来の生テキストからヒアリング JSON オブジェクトを復元する */
function parseModelJsonContent(raw: string): unknown {
  const normalized = normalizeJsonText((raw ?? "").trim());
  const candidates: string[] = [normalized];
  const extracted = extractLeadingJsonObject(normalized);
  if (extracted && extracted !== normalized) candidates.push(extracted);
  if (!extracted) {
    const fromRaw = extractLeadingJsonObject(raw.trim());
    if (fromRaw) candidates.push(fromRaw);
  }
  const repaired = tryRepairTruncatedTopLevelJson(normalized);
  if (repaired) candidates.push(repaired);
  const repairedRaw = tryRepairTruncatedTopLevelJson(raw.trim());
  if (repairedRaw && repairedRaw !== repaired) candidates.push(repairedRaw);
  for (const t of candidates) {
    const p = safeJsonParse(t);
    if (p !== null && typeof p === "object") return p;
  }
  for (const t of candidates) {
    const relaxed = t.replace(/,\s*([}\]])/g, "$1");
    const p = safeJsonParse(relaxed);
    if (p !== null && typeof p === "object") return p;
  }
  const arr = safeJsonParse(candidates[0] ?? "");
  if (Array.isArray(arr) && arr.length > 0 && arr[0] && typeof arr[0] === "object") {
    return arr[0];
  }
  const salvaged = salvageHearingObjectFromLooseText(normalized);
  if (salvaged && typeof salvaged.busy !== "undefined") return salvaged;
  return null;
}

function clampBusy(n: unknown): 0 | 1 | 2 {
  if (n === 0 || n === 1 || n === 2) return n;
  if (n === "0" || n === "1" || n === "2") return Number(n) as 0 | 1 | 2;
  if (typeof n === "number" && !Number.isNaN(n)) {
    return Math.round(Math.max(0, Math.min(2, n))) as 0 | 1 | 2;
  }
  const x = typeof n === "string" ? Number(n.trim()) : NaN;
  if (x === 0 || x === 1 || x === 2) return x;
  return 1;
}

function clampText(s: string, max: number): string {
  const t = s.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

function asCompanionChain(v: unknown): CompanionAiChain | undefined {
  if (!v || typeof v !== "object") return undefined;
  const o = v as Record<string, unknown>;
  const pick = (k: string) => (typeof o[k] === "string" ? clampText(o[k] as string, 900) : "");
  const execution = pick("execution");
  const goal = pick("goal");
  const information = pick("information");
  const placement = pick("placement");
  if (!execution && !goal && !information && !placement) return undefined;
  return { execution, goal, information, placement };
}

function asTaskMonthClear(v: unknown): TaskMonthClearSpec | undefined {
  if (!v || typeof v !== "object") return undefined;
  const o = v as Record<string, unknown>;
  const ym = typeof o.yearMonth === "string" ? o.yearMonth.trim() : "";
  if (!/^\d{4}-\d{2}$/.test(ym)) return undefined;
  return { yearMonth: ym, includePinned: o.includePinned === true };
}

function asTaskDeleteIds(v: unknown): string[] | undefined {
  if (!Array.isArray(v)) return undefined;
  const ids = v
    .map((x) => (typeof x === "string" ? x.trim() : ""))
    .filter((x) => x.length > 0)
    .slice(0, 5000);
  return ids.length ? ids : undefined;
}

function asTaskCreates(v: unknown): AiTaskCreatePatch[] | undefined {
  if (!Array.isArray(v)) return undefined;
  const out: AiTaskCreatePatch[] = [];
  for (const x of v.slice(0, 14)) {
    if (!x || typeof x !== "object") continue;
    const row = x as Record<string, unknown>;
    const title = typeof row.title === "string" ? row.title.trim() : "";
    const date = typeof row.date === "string" ? row.date.trim() : "";
    const sub = row.subject;
    if (!title || title.length > 200) continue;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
    if (sub !== "english" && sub !== "math") continue;
    const hourRaw = row.hour;
    const hour =
      typeof hourRaw === "number" && hourRaw >= 0 && hourRaw <= 23 ? hourRaw : undefined;
    const imp = row.importance;
    const importance =
      imp === "A" || imp === "B" || imp === "C" ? imp : undefined;
    const notes =
      typeof row.notes === "string" && row.notes.trim().length > 0
        ? row.notes.trim().slice(0, 500)
        : undefined;
    out.push({ title: title.slice(0, 200), subject: sub, date, hour, importance, notes });
  }
  return out.length ? out : undefined;
}

function asHearingResult(
  v: unknown
): {
  hearing: TomorrowHearing;
  reason?: string;
  changeSummary?: string;
  phaseNotes?: string[];
  questions?: AiClarifyQuestion[];
  taskAdjustments?: AiTaskAdjustmentPatch[];
  taskCreates?: AiTaskCreatePatch[];
  companionChain?: CompanionAiChain;
  homePlanOps?: HomePlanOp[];
  taskMonthClear?: TaskMonthClearSpec;
  taskDeletes?: string[];
} | null {
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  const busy = clampBusy(o.busy);
  const lateStart = o.lateStart === true || o.lateStart === "true";
  const leanRaw = o.subjectLean;
  const leanNorm =
    typeof leanRaw === "string" ? leanRaw.trim().toLowerCase() : leanRaw;
  const subjectLean =
    leanNorm === "english" || leanNorm === "math" || leanNorm === "balance"
      ? leanNorm
      : "balance";
  const reasonRaw = typeof o.reason === "string" ? o.reason.trim() : "";
  const reason = reasonRaw.length > 0 ? clampText(reasonRaw, 520) : undefined;
  const changeRaw = typeof o.changeSummary === "string" ? o.changeSummary.trim() : "";
  const changeSummary = changeRaw.length > 0 ? clampText(changeRaw, 520) : undefined;
  const phaseNotes = Array.isArray(o.phaseNotes)
    ? o.phaseNotes
        .filter((x): x is string => typeof x === "string")
        .map((x) => clampText(x.trim(), 320))
        .filter((x) => x.length > 0)
        .slice(0, 10)
    : undefined;
  const questions = Array.isArray(o.questions)
    ? o.questions
        .map((x, i) => {
          if (!x || typeof x !== "object") return null;
          const row = x as Record<string, unknown>;
          const text = typeof row.text === "string" ? row.text.trim() : "";
          if (!text) return null;
          const idRaw = typeof row.id === "string" ? row.id.trim() : "";
          return { id: idRaw || `q${i + 1}`, text: text.slice(0, 120) };
        })
        .filter((x): x is AiClarifyQuestion => Boolean(x))
        .slice(0, 3)
    : undefined;
  const taskAdjustments = Array.isArray(o.taskAdjustments)
    ? o.taskAdjustments
        .map((x) => {
          if (!x || typeof x !== "object") return null;
          const row = x as Record<string, unknown>;
          const id = typeof row.id === "string" ? row.id.trim() : "";
          const date = typeof row.date === "string" ? row.date.trim() : "";
          if (!id || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
          const hourRaw = row.hour;
          const hour =
            typeof hourRaw === "number" && hourRaw >= 0 && hourRaw <= 23 ? hourRaw : undefined;
          return { id, date, hour } as AiTaskAdjustmentPatch;
        })
        .filter((x): x is AiTaskAdjustmentPatch => Boolean(x))
        .slice(0, 48)
    : undefined;
  const taskCreates = asTaskCreates(o.taskCreates);
  const companionChain = asCompanionChain(o.companionChain);
  const rawHomeOps = (o as Record<string, unknown>)["home_plan_ops"];
  const homePlanOps = asHomePlanOps(o.homePlanOps ?? rawHomeOps);
  const rawTmc = (o as Record<string, unknown>)["task_month_clear"];
  const taskMonthClear = asTaskMonthClear(o.taskMonthClear ?? rawTmc);
  const rawTd = (o as Record<string, unknown>)["task_deletes"];
  const taskDeletes = asTaskDeleteIds(o.taskDeletes ?? rawTd);
  return {
    hearing: { busy, lateStart, subjectLean },
    reason,
    changeSummary,
    phaseNotes,
    questions,
    taskAdjustments,
    taskCreates,
    companionChain,
    homePlanOps,
    taskMonthClear,
    taskDeletes,
  };
}

async function resolveApiKey(): Promise<string | undefined> {
  const envKey =
    process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY ??
    process.env.ANTHROPIC_API_KEY ??
    process.env.EXPO_PUBLIC_OPENAI_API_KEY ??
    process.env.EXPO_PUBLIC_OPENAI_KEY ??
    process.env.OPENAI_API_KEY;
  if (envKey?.trim()) return envKey.trim();
  const stored =
    (await simpleStorageGet("aibou.anthropicApiKey")) ??
    (await simpleStorageGet("anthropic_api_key")) ??
    (await simpleStorageGet("aibou.openaiApiKey")) ??
    (await simpleStorageGet("openai_api_key"));
  return stored?.trim() || undefined;
}

function resolveProvider(): "anthropic" | "openai" {
  const hasAnthropicEnv = Boolean(
    process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY?.trim() || process.env.ANTHROPIC_API_KEY?.trim()
  );
  if (hasAnthropicEnv) return "anthropic";
  return "openai";
}

function resolveProxyUrl(): string | undefined {
  const v = process.env.EXPO_PUBLIC_AI_PROXY_URL;
  if (!v?.trim()) return undefined;
  return v.trim();
}

function summarizeTasksOverdue(tasks: Task[], todayKey: string): string {
  const pool = tasks
    .filter((t) => !t.completed && !t.pinned && t.date <= todayKey)
    .sort((a, b) => a.date.localeCompare(b.date) || a.hour - b.hour)
    .slice(0, 24)
    .map(
      (t) =>
        `id=${t.id} ${t.date} ${String(t.hour).padStart(2, "0")}:00 subject=${t.subject} title=${t.title}`
    );
  return pool.join("\n");
}

/** 未来日の未完了も id 付きで渡す（「◯月から」等の意図で日付を動かすため） */
function summarizeTasksFuture(tasks: Task[], todayKey: string): string {
  const pool = tasks
    .filter((t) => !t.completed && !t.pinned && t.date > todayKey)
    .sort((a, b) => a.date.localeCompare(b.date) || a.hour - b.hour)
    .slice(0, 40)
    .map(
      (t) =>
        `id=${t.id} ${t.date} ${String(t.hour).padStart(2, "0")}:00 subject=${t.subject} title=${t.title}`
    );
  return pool.join("\n");
}

/** 科目ラベルだけの粗いタスクがあり、立案で taskCreates への落とし込みを促す */
function needsCoarseStudyPlanHint(tasks: Task[]): boolean {
  const pool = tasks.filter((t) => !t.completed && !t.pinned);
  if (pool.length === 0) return false;
  const coarse = /^(英語|数学)(の学習|勉強)?$|^勉強$|^学習$/;
  return pool.some((t) => {
    const title = t.title.trim();
    if (title.length > 24) return false;
    return coarse.test(title);
  });
}

export async function requestAiTomorrowHearing(
  input: AiHearingInput
): Promise<AiTomorrowPlanResult> {
  const proxyUrl = resolveProxyUrl();
  const proxyProvider = process.env.EXPO_PUBLIC_AI_PROXY_PROVIDER;
  const provider =
    proxyUrl && proxyProvider !== "openai"
      ? "anthropic"
      : proxyUrl && proxyProvider === "openai"
        ? "openai"
        : resolveProvider();
  const model =
    provider === "anthropic"
      ? "claude-haiku-4-5-20251001"
      : process.env.EXPO_PUBLIC_OPENAI_MODEL ?? "gpt-4o-mini";
  const modelUsed = `${provider}:${model}`;
  const apiKey = proxyUrl ? undefined : await resolveApiKey();
  if (!proxyUrl && !apiKey) {
    return {
      hearing: input.fallback,
      source: "fallback",
      modelUsed,
      error:
        "APIキー未設定（EXPO_PUBLIC_ANTHROPIC_API_KEY または EXPO_PUBLIC_OPENAI_API_KEY）",
    };
  }
  const prompt = [
    "以下は現在セッションの動的コンテキストです。ルール本体はサーバー側で docs/ai-prompt.md を参照しています。",
    "返却は JSON 1オブジェクトのみ。",
    `todayKey=${input.todayKey}`,
    `tomorrowKey=${input.tomorrowKey}`,
    `todayBusySlotCount=${input.todayBusySlotCount}`,
    `fallback=${JSON.stringify(input.fallback)}`,
    `qaContext=${input.qaContext ?? "(none)"}`,
    `sessionContext=${input.sessionContext ?? "(none)"}`,
    "内部仕様:",
    COMPANION_AI_SYSTEM_PROMPT,
    "未完了タスク（今日以前・繰越候補、先頭24件）:",
    summarizeTasksOverdue(input.tasks, input.todayKey) || "(none)",
    "未完了タスク（明日以降・意図で日付変更し得る、先頭40件）:",
    summarizeTasksFuture(input.tasks, input.todayKey) || "(none)",
    ...(needsCoarseStudyPlanHint(input.tasks)
      ? [
          "【立案の補足】未完了タスクに科目名だけなど粗いタイトルがある。taskCreates（english/math）で演習単位に分解すること。",
        ]
      : []),
  ].join("\n");

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 25000);
    const directApiKey = apiKey ?? "";
    const res = proxyUrl
      ? await fetch(proxyUrl, {
          method: "POST",
          signal: controller.signal,
          headers: {
            "Content-Type": "application/json",
          },
            body: JSON.stringify({
            provider,
            model,
            prompt,
          }),
        })
      : provider === "anthropic"
        ? await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            signal: controller.signal,
            headers: {
              "Content-Type": "application/json",
              "x-api-key": directApiKey,
              "anthropic-version": "2023-06-01",
            },
            body: JSON.stringify({
              model,
              max_tokens: 4096,
              temperature: 0.2,
              system: "Return only valid JSON.",
              messages: [{ role: "user", content: prompt }],
            }),
          })
        : await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            signal: controller.signal,
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${directApiKey}`,
            },
            body: JSON.stringify({
              model,
              temperature: 0.2,
              response_format: { type: "json_object" },
              messages: [
                { role: "system", content: "Return only valid JSON." },
                { role: "user", content: prompt },
              ],
            }),
          });
    clearTimeout(timer);
    if (!res.ok) {
      let detail = "";
      try {
        const errJson = (await res.json()) as { error?: { message?: string } };
        detail = errJson.error?.message ? `: ${errJson.error.message}` : "";
      } catch {
        detail = "";
      }
      return {
        hearing: input.fallback,
        source: "fallback",
        modelUsed,
        error: `${provider === "anthropic" ? "Anthropic" : "OpenAI"} HTTP ${res.status}${detail}`,
      };
    }
    const json = (await res.json()) as
      | { choices?: Array<{ message?: { content?: string } }> }
      | { content?: Array<{ type?: string; text?: string }> }
      | { content?: string; error?: string };
    const proxyErr = (json as { error?: string }).error;
    if (proxyUrl && typeof proxyErr === "string" && proxyErr.trim() && !("content" in json && (json as { content?: unknown }).content)) {
      return {
        hearing: input.fallback,
        source: "fallback",
        modelUsed,
        error: `Proxy: ${proxyErr.trim()}`,
      };
    }
    const content =
      proxyUrl
        ? (json as { content?: string; error?: string }).content ?? ""
        : provider === "anthropic"
        ? (json as { content?: Array<{ type?: string; text?: string }> }).content?.find(
            (c) => c?.type === "text"
          )?.text ?? ""
        : (json as { choices?: Array<{ message?: { content?: string } }> }).choices?.[0]?.message
            ?.content ?? "";
    const parsed = parseModelJsonContent(typeof content === "string" ? content : "");
    const out = asHearingResult(parsed);
    if (!out) {
      const head = typeof content === "string" ? content.trim().slice(0, 160).replace(/\s+/g, " ") : "";
      return {
        hearing: input.fallback,
        source: "fallback",
        modelUsed,
        error: `${proxyUrl ? "Proxy" : provider === "anthropic" ? "Anthropic" : "OpenAI"}応答JSONの解析失敗${head ? `（先頭: ${head}…）` : "（空応答）"}`,
      };
    }
    return {
      hearing: out.hearing,
      source: "ai",
      modelUsed,
      reason: out.reason,
      changeSummary: out.changeSummary,
      phaseNotes: out.phaseNotes,
      questions: (input.qaContext?.trim().length ?? 0) > 0 ? [] : out.questions,
      taskAdjustments: out.taskAdjustments,
      taskCreates: out.taskCreates,
      companionChain: out.companionChain,
      homePlanOps: out.homePlanOps,
      taskMonthClear: out.taskMonthClear,
      taskDeletes: out.taskDeletes,
    };
  } catch (e) {
    return {
      hearing: input.fallback,
      source: "fallback",
      modelUsed,
      error:
        e instanceof Error
          ? e.message
          : `${proxyUrl ? "Proxy" : provider === "anthropic" ? "Anthropic" : "OpenAI"}接続失敗`,
    };
  }
}

