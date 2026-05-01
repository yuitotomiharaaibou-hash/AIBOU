import { useEffect, useState } from "react";
import { View, ActivityIndicator, Platform } from "react-native";
import { useRouter } from "expo-router";
import { useProfile } from "@/context/ProfileContext";
import { useTasks } from "@/context/TasksContext";
import { AibouOnboardingFlow } from "@/components/onboarding/AibouOnboardingFlow";
import { ONBOARDING_STORAGE_KEY } from "@/lib/onboardingSteps";
import { UI_SCREEN } from "@/constants/theme";
import { simpleStorageGet, simpleStorageSet } from "@/lib/simpleStorage";
import { clearWebLearningStorage } from "@/lib/webOnboardingFlatReset";

type StartPhase = "boot" | "onboarding" | "leaving";

/** Web: 学習ストレージ消去直後のリロードを1回だけ挟む（Provider が古い値を読まないようにする） */
const WEB_POST_FLAT_RELOAD = "aibou.web.postFlatReload";

export default function StartScreen() {
  const router = useRouter();
  const { profile } = useProfile();
  const { applyKoko2TaskDistribution } = useTasks();
  const [phase, setPhase] = useState<StartPhase>("boot");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (Platform.OS === "web") {
          const ss = (globalThis as unknown as { sessionStorage?: Storage }).sessionStorage;
          if (ss?.getItem(WEB_POST_FLAT_RELOAD) === "1") {
            ss.removeItem(WEB_POST_FLAT_RELOAD);
          } else {
            await clearWebLearningStorage();
            ss?.setItem(WEB_POST_FLAT_RELOAD, "1");
            (globalThis as unknown as { location: { reload: () => void } }).location.reload();
            return;
          }
        }

        if (
          Platform.OS === "web" &&
          typeof globalThis !== "undefined" &&
          typeof (globalThis as unknown as { location?: { href: string } }).location?.href ===
            "string"
        ) {
          const href = (globalThis as unknown as { location: { href: string } }).location.href;
          const u = new URL(href);
          if (u.searchParams.get("resetOnboarding") === "1") {
            await simpleStorageSet(ONBOARDING_STORAGE_KEY, "");
            u.searchParams.delete("resetOnboarding");
            const next = `${u.pathname}${u.search}${u.hash}`;
            (globalThis as unknown as { history: { replaceState: (a: unknown, b: string, c: string) => void } }).history.replaceState(
              {},
              "",
              next || "/"
            );
          }
        }

        const v = await simpleStorageGet(ONBOARDING_STORAGE_KEY);
        if (cancelled) return;

        if (v === "1") {
          if (Platform.OS === "web") {
            // フラットリロード後は通常ここに来ない（キーは消えている）。念のため表紙フローへ。
            setPhase("onboarding");
            return;
          }
          router.replace("/(tabs)/home");
          setPhase("leaving");
          return;
        }
        setPhase("onboarding");
      } catch {
        if (!cancelled) setPhase("onboarding");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const complete = async () => {
    try {
      await simpleStorageSet(ONBOARDING_STORAGE_KEY, "1");
    } catch {
      /* ナビは続行 */
    }
    applyKoko2TaskDistribution(profile, true);
    router.replace("/(tabs)/home");
  };

  if (phase === "boot" || phase === "leaving") {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: UI_SCREEN,
        }}
      >
        <ActivityIndicator size="large" color="#0d9488" />
      </View>
    );
  }

  return <AibouOnboardingFlow onComplete={complete} />;
}
