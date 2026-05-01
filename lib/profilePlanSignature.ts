import type { ProfileKey, ProfileState } from "@/context/ProfileContext";

const KEYS: ProfileKey[] = [
  "school",
  "grade",
  "club",
  "juku",
  "englishSlots",
  "mathSlots",
  "username",
];

/** ホーム推測プラン等を再生成すべきときに変わる署名 */
export function profilePlanSignature(profile: ProfileState): string {
  return KEYS.map((k) => `${k}=${profile[k] ?? ""}`).join("&");
}
