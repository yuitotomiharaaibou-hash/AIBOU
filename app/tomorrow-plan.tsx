import { useEffect } from "react";
import { useRouter } from "expo-router";

/**
 * 旧フローは廃止。ホームの日付ボタンからワンタップで明日の計画へ遷移します。
 */
export default function TomorrowPlanRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/(tabs)/home");
  }, [router]);
  return null;
}
