import { useEffect, useState } from "react";
import { View, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useProfile } from "@/context/ProfileContext";
import { useTasks } from "@/context/TasksContext";
import { AibouOnboardingFlow } from "@/components/onboarding/AibouOnboardingFlow";
import { ONBOARDING_STORAGE_KEY } from "@/lib/onboardingSteps";
import { UI_SCREEN } from "@/constants/theme";
import { simpleStorageGet, simpleStorageSet } from "@/lib/simpleStorage";

export default function StartScreen() {
  const router = useRouter();
  const { profile } = useProfile();
  const { applyKoko2TaskDistribution } = useTasks();
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const v = await simpleStorageGet(ONBOARDING_STORAGE_KEY);
        if (!cancelled && v === "1") {
          router.replace("/(tabs)/home");
          return;
        }
      } catch {
        /* 初回オンボーディングへ */
      } finally {
        if (!cancelled) setBusy(false);
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

  if (busy) {
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
