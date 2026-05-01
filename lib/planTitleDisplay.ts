/** カレンダー・ホームの予定チップ用に（…）や(...)を除いた短い表示 */
export function planTitleShortDisplay(title: string): string {
  const t = (title ?? "").trim();
  const stripped = t
    .replace(/（[^）]*）/g, "")
    .replace(/\([^)]*\)/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return stripped.length > 0 ? stripped : t;
}
