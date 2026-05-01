import { Platform } from "react-native";

/** Web の localStorage に残してよいキー（API キーなど） */
const PRESERVE_KEYS = new Set([
  "aibou.openaiApiKey",
  "openai_api_key",
  "aibou.anthropicApiKey",
  "anthropic_api_key",
]);

/**
 * npm run web 用: ユーザー学習・進捗系のストレージだけ消し、アプリをフラットな状態にする。
 * API キーは残す。
 */
export async function clearWebLearningStorage(): Promise<void> {
  if (Platform.OS !== "web") return;
  const ls = (globalThis as unknown as { localStorage?: Storage }).localStorage;
  if (!ls) return;
  const toRemove: string[] = [];
  for (let i = 0; i < ls.length; i++) {
    const k = ls.key(i);
    if (!k || PRESERVE_KEYS.has(k)) continue;
    if (k.startsWith("aibou.") || k.startsWith("aibou_")) toRemove.push(k);
  }
  for (const k of toRemove) ls.removeItem(k);
}
