import "../global.css";
import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { TasksProvider } from "@/context/TasksContext";
import { ProfileProvider } from "@/context/ProfileContext";
import { HomeScheduleProvider } from "@/context/HomeScheduleContext";
import { ScoreProvider } from "@/context/ScoreContext";
import { RulesProvider } from "@/context/RulesContext";
import { BoardProvider } from "@/context/BoardContext";
import { JudgmentRulesProvider } from "@/context/JudgmentRulesContext";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <TasksProvider>
        <ProfileProvider>
          <BoardProvider>
            <HomeScheduleProvider>
              <ScoreProvider>
                <RulesProvider>
                  <JudgmentRulesProvider>
                  <Stack
                    screenOptions={{
                      headerShown: false,
                    }}
                  >
                    <Stack.Screen name="index" />
                    <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                    <Stack.Screen name="board" options={{ headerShown: false }} />
                    <Stack.Screen name="day/[date]" options={{ headerShown: false }} />
                    <Stack.Screen name="rules" />
                    <Stack.Screen name="tomorrow-plan" options={{ headerShown: false }} />
                    <Stack.Screen name="replan-companion" options={{ headerShown: false }} />
                  </Stack>
                  </JudgmentRulesProvider>
                </RulesProvider>
              </ScoreProvider>
            </HomeScheduleProvider>
          </BoardProvider>
        </ProfileProvider>
      </TasksProvider>
    </SafeAreaProvider>
  );
}
