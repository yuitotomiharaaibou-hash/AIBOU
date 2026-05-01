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
    "あなたは学習計画の調整AIです。",
    "内部仕様:",
    COMPANION_AI_SYSTEM_PROMPT,
    "明日の再配置方針を以下のJSONだけで返してください（説明文・マークダウンフェンス禁止。1行の厳密なJSON1オブジェクトのみ）。",
    '{"busy":0|1|2,"lateStart":boolean,"subjectLean":"english"|"math"|"balance","reason":"…","changeSummary":"…","phaseNotes":["短文"],"questions":[],"task_month_clear":{"yearMonth":"YYYY-MM","includePinned":false},"task_deletes":["既存タスクid"],"taskAdjustments":[],"taskCreates":[],"home_plan_ops":[],"companionChain":{"execution":"…","goal":"…","information":"…","placement":"…"}}',
    "reason と changeSummary は各120文字以内。文中にASCIIのダブルクォート \" は使わない（『』や「」は可）。長文は phaseNotes に分割。",
    "本機能は学習タスクの翌日繰越だけではない。その瞬間の最適計画: タスク日付の再配置・新規タスク・ホーム予定の整理をまとめて判断する。",
    "相棒フローでは「今日以前の未完了を明日へ一括移動」するローカル処理はユーザーがオフにできる。5月から院試・再来月開始などは taskAdjustments で 5月以降の具体日付へ必ず落とす（明日へ寄せるだけに頼らない）。",
    "「明日の予定を消す」「4/30の予定を消す」は home_plan_ops の clear_day。日付は sessionContext の tomorrowKey 見出しかユーザー指定日。予定削除の要望があるのに home_plan_ops が空は不適切。",
    "home_plan_ops: ホーム画面の「予定」（sessionContext の id= 行）のみ操作。学習タスク(KOKOの id)は触らない。",
    "home_plan_ops の op: clear_day はその日の予定をすべて削除。delete は planIds に列挙した id だけ削除。id は必ず sessionContext のホーム予定一覧と一致。",
    "ユーザーが「明日の予定を全部消す」「当日の予定をすべて削除」等と言ったら、該当日付に clear_day を入れる。不要なら home_plan_ops は空配列。",
    "学習タスク（KOKO）で「◯月のタスクを全部消す」「4月分をリセット」等: task_month_clear に {yearMonth:\"YYYY-MM\",includePinned:false}。ピン留めも消すなら includePinned:true。",
    "学習タスクを個別 id で消すときは task_deletes に id の配列（一覧の id のみ）。task_month_clear と併用可。",
    "sessionContext に月別の学習タスク件数 count が載る。reason に「未完了なし」「全削除済み」等と書く場合、その月の count=0 と矛盾しないようにすること。",
    "companionChain は承認UI用。必ず sessionContext の事実と qaContext の要望を踏まえ、実行→目標→情報→立案の順で「なぜそう言えるか（だから）」が途切れないように書く。各フィールドは具体的な主張・対策・日付や科目名を含む日本語で、空文字は禁止。",
    "execution: 昨日〜今日の実行事実（未完了の理由仮説・次回対策・時間帯の再配置方針など）。",
    "goal: 望むアウトカムの再確認・熱意・達成時の便益。第三者が検証できる具体（時期・判定条件）まで落とす。文脈に既にある具体を繰り返し聞かない。",
    "information: 足りない知識・成功者の型・外部情報が必要な論点。ここで挙げた打ち手は後段の taskCreates / taskAdjustments と一対一で対応させる（情報だけで終わらせない）。",
    "placement: 目標を細分化したうえで、taskCreates に落とす具体行（教材・単元・演習単位がタイトルから分かる）を決め、既存タスクの日付移動（taskAdjustments）とセットで書く。粗い1行の再配置だけで終わらせない。",
    "taskAdjustments: 既存タスクの日付/時刻を変えるときのみ。id は下の一覧の id のみ。ここに無い id を書くことの禁止が『捏造禁止』の主な意味。",
    "taskCreates: 立案の結果として、目標達成に必要な新しい学習行を追加する。一覧が粗い（科目名だけ等）ときは情報で述べた打ち手をここに必ず反映する。subject は english または math。日付は tomorrowKey 以降。定番の教材・単元分割は一般的学習設計として出力してよい（ユーザーが口頭で言っていなくてもよい）。",
    "taskAdjustments の id は必ず下の一覧に出ている id と完全一致。hour は省略可（省略時は現状維持）。",
    "固定パターンマッチに頼らず、任意の自然言語の意図を読み取って具体化すること。",
    "判断基準: 今日までの未完了量、科目偏り、無理のない負荷。",
    "目的は単なる翌日繰越ではなく、再立案ループで計画の有効性・実現性・納得感を高めること。",
    "実行→目標→情報→立案の順に仮説を更新し、最終的な計画判断を reason / changeSummary / phaseNotes に反映する。",
    "phaseNotes は再立案フェーズ（確認→改善→再配置）の論点を短文で。",
    "questions は本当に判断不能な不足情報がある時のみ 1〜3 件。不要なら必ず空配列。目標の座標・合格条件・前提が文脈から定まらない場合は不足点を聞く。聞く内容は毎回文脈から決め、クライアントは特定トピックの固定質問を挿入しない。",
    "qaContext に既存回答がある場合は同趣旨の再質問を禁止し、同じ質問文を繰り返さない。",
    `todayKey=${input.todayKey}`,
    `tomorrowKey=${input.tomorrowKey}`,
    `todayBusySlotCount=${input.todayBusySlotCount}`,
    `fallback=${JSON.stringify(input.fallback)}`,
    `qaContext=${input.qaContext ?? "(none)"}`,
    "qaContext は companion.userNote に加え、相棒の3つの質問への回答も含む。自由要望が空でも回答だけで具体化すること。",
    `sessionContext=${input.sessionContext ?? "(none)"}`,
    "qaContext と sessionContext の両方を根拠にする。要望だけをなぞらず、sessionContext の事実（昨日のタスク状況・ホーム予定・プロフィール）と突き合わせて矛盾がないか確認する。",
    "出力は reason / changeSummary / phaseNotes / companionChain / task_month_clear / task_deletes / taskAdjustments / taskCreates / home_plan_ops に一貫して反映する。",
    "未完了タスク（今日以前・繰越候補、先頭24件）:",
    summarizeTasksOverdue(input.tasks, input.todayKey) || "(none)",
    "未完了タスク（明日以降・意図で日付変更し得る、先頭40件）:",
    summarizeTasksFuture(input.tasks, input.todayKey) || "(none)",
    ...(needsCoarseStudyPlanHint(input.tasks)
      ? [
          "【立案の補足】未完了タスクに科目名だけなど粗いタイトルがある。companionChain.information / placement でギャップを述べ、taskCreates（english/math）で演習単位の行を tomorrowKey 以降に複数件含める。taskAdjustments のみでは不十分。",
        ]
      : []),
  ].join("\n");

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 25000);
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
              "x-api-key": apiKey,
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
              Authorization: `Bearer ${apiKey}`,
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

