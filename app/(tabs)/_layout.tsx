import { Tabs } from "expo-router";
import { Home, ListTodo, Calendar, BarChart2, UserRound } from "lucide-react-native";
import { PRIMARY, UI_BORDER, UI_SCREEN, UI_TEXT_SECONDARY } from "@/constants/theme";

const ICON = 24;
const SW = 1.75;

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: PRIMARY,
        tabBarInactiveTintColor: UI_TEXT_SECONDARY,
        tabBarStyle: {
          backgroundColor: UI_SCREEN,
          borderTopColor: UI_BORDER,
          borderTopWidth: 1,
          paddingTop: 8,
          paddingBottom: 10,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: "600",
          letterSpacing: 0.2,
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "ホーム",
          tabBarIcon: ({ color }) => <Home size={ICON} color={color} strokeWidth={SW} />,
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: "カレンダー",
          tabBarIcon: ({ color }) => <Calendar size={ICON} color={color} strokeWidth={SW} />,
        }}
      />
      <Tabs.Screen
        name="tasklist"
        options={{
          title: "タスク",
          tabBarIcon: ({ color }) => <ListTodo size={ICON} color={color} strokeWidth={SW} />,
        }}
      />
      <Tabs.Screen
        name="report"
        options={{
          title: "レポート",
          tabBarIcon: ({ color }) => <BarChart2 size={ICON} color={color} strokeWidth={SW} />,
        }}
      />
      <Tabs.Screen
        name="mypage"
        options={{
          title: "マイページ",
          tabBarIcon: ({ color }) => <UserRound size={ICON} color={color} strokeWidth={SW} />,
        }}
      />
    </Tabs>
  );
}
