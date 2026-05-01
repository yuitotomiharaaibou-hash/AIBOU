import type { HomePlanOp } from "@/lib/aiHomePlanOps";

function dedupeOps(ops: HomePlanOp[]): HomePlanOp[] {
  const seen = new Set<string>();
  const out: HomePlanOp[] = [];
  for (const op of ops) {
    const k = op.op === "clear_day" ? `c:${op.date}` : `d:${op.date}:${op.planIds.join(",")}`;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(op);
  }
  return out;
}

/**
 * AI が home_plan_ops を返さないとき、qaContext の自然言語から最低限の予定クリアを推測する（補助）。
 */
export function inferHomePlanOpsFromQa(
  qaContext: string,
  todayKey: string,
  tomorrowKey: string
): HomePlanOp[] {
  const text = qaContext.replace(/\s+/g, " ").trim();
  if (!text) return [];
  const year = todayKey.slice(0, 4);
  const out: HomePlanOp[] = [];

  const wantsKill =
    /削除|消して|消す|クリア|空に|なくして|リセット|全部|すべて|全て/.test(text);
  if (!wantsKill) return [];

  const mentionsPlan = /予定|ホーム|カレンダー|スケジュール|ブロック/.test(text);

  if (
    mentionsPlan &&
    /明日|翌日|次の日|あした/.test(text)
  ) {
    out.push({ op: "clear_day", date: tomorrowKey });
  }

  const md = text.match(
    new RegExp(`${year}-(0[1-9]|1[0-2])-(0[1-9]|[12]\\d|3[01])`)
  );
  if (md && mentionsPlan) {
    out.push({ op: "clear_day", date: md[0] });
  }

  if (mentionsPlan && /\b4\s*\/\s*30\b|4\s*月\s*30\s*日/.test(text)) {
    out.push({ op: "clear_day", date: `${year}-04-30` });
  }

  return dedupeOps(out);
}

/** AI の配列とフォールバックをマージ（AI 優先、日重複は一本化） */
export function mergeHomePlanOpsWithFallback(
  aiOps: HomePlanOp[] | undefined,
  qaContext: string,
  todayKey: string,
  tomorrowKey: string
): HomePlanOp[] {
  const inferred = inferHomePlanOpsFromQa(qaContext, todayKey, tomorrowKey);
  return dedupeOps([...(aiOps ?? []), ...inferred]);
}
