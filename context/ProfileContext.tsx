import React, {
  createContext,
  useContext,
  useMemo,
  useState,
  useCallback,
  ReactNode,
} from "react";

export type ProfileKey =
  | "school"
  | "grade"
  | "club"
  | "juku"
  | "englishSlots"
  | "mathSlots"
  | "username";

export type ProfileState = Partial<Record<ProfileKey, string>>;

type ProfileContextValue = {
  profile: ProfileState;
  setField: (key: ProfileKey, value: string) => void;
};

const ProfileContext = createContext<ProfileContextValue | undefined>(
  undefined
);

export const PROFILE_OPTIONS: Record<ProfileKey, string[]> = {
  school: [
    "開成",
    "桜蔭",
    "筑大駒場",
    "麻布",
    "海城",
    "駒場東邦",
    "筑大附",
    "豊島岡",
    "澁谷幕張",
    "渋教渋谷",
    "女子学院",
    "雙葉",
    "早稲田",
    "聖光学院",
    "栄光学園",
    "その他",
  ],
  grade: ["中1", "中2", "中3", "高1", "高2", "高3"],
  // 部活は後で本番データに差し替え予定のプレースホルダ
  club: ["サッカー部", "テニス部", "軽音部", "バスケ部", "文化系サークル", "帰宅部"],
  juku: ["鉄緑会", "その他"],
  // 英語の授業コマ
  englishSlots: [
    "月曜17:20~20:20",
    "火曜17:20~20:20",
    "水曜17:20~20:20",
    "木曜17:20~20:20",
    "金曜17:20~20:20",
    "土曜14:00~17:00",
    "土曜17:30~20:30",
    "受講なし",
  ],
  mathSlots: [
    "月曜17:20~20:20",
    "火曜17:20~20:20",
    "水曜17:20~20:20",
    "木曜17:20~20:20",
    "金曜17:20~20:20",
    "土曜14:00~17:00",
    "土曜17:30~20:30",
    "受講なし",
  ],
  username: [],
};

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<ProfileState>({});

  const setField = useCallback((key: ProfileKey, value: string) => {
    setProfile((prev) => ({ ...prev, [key]: value }));
  }, []);

  const value = useMemo(
    () => ({
      profile,
      setField,
    }),
    [profile, setField]
  );

  return (
    <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>
  );
}

export function useProfile(): ProfileContextValue {
  const ctx = useContext(ProfileContext);
  if (!ctx) {
    throw new Error("useProfile must be used within ProfileProvider");
  }
  return ctx;
}

