import React, {
  createContext,
  useContext,
  useMemo,
  useState,
  useCallback,
  useEffect,
  ReactNode,
} from "react";
import { simpleStorageGet, simpleStorageSet } from "@/lib/simpleStorage";
import {
  USER_DETAIL_KEYS,
  type UserDetailKey,
  type UserDetailState,
} from "@/lib/userDetailFields";

export type ProfileKey =
  | "school"
  | "grade"
  | "club"
  | "juku"
  | "englishSlots"
  | "mathSlots"
  | "username";

export type ProfileState = Partial<Record<ProfileKey, string>>;

const USER_DETAIL_STORAGE = "aibou.userDetailFields.v1";

type ProfileContextValue = {
  profile: ProfileState;
  setField: (key: ProfileKey, value: string) => void;
  userDetails: UserDetailState;
  setUserDetail: (key: UserDetailKey, value: string) => void;
  /** 空のキーだけ推測文案で埋める（ユーザー入力を上書きしない） */
  mergeInferredUserDetails: (patch: UserDetailState) => void;
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
  /** 部活動・課外活動は曜日・時間帯（ClubSchedulePicker）で入力 */
  club: [],
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
  const [userDetails, setUserDetails] = useState<UserDetailState>({});

  useEffect(() => {
    let mounted = true;
    void (async () => {
      const raw = await simpleStorageGet(USER_DETAIL_STORAGE);
      if (!mounted || !raw) return;
      try {
        const parsed = JSON.parse(raw) as UserDetailState;
        if (parsed && typeof parsed === "object") {
          setUserDetails(parsed);
        }
      } catch {
        /* ignore */
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    void simpleStorageSet(USER_DETAIL_STORAGE, JSON.stringify(userDetails));
  }, [userDetails]);

  const setField = useCallback((key: ProfileKey, value: string) => {
    setProfile((prev) => ({ ...prev, [key]: value }));
  }, []);

  const setUserDetail = useCallback((key: UserDetailKey, value: string) => {
    setUserDetails((prev) => ({ ...prev, [key]: value }));
  }, []);

  const mergeInferredUserDetails = useCallback((patch: UserDetailState) => {
    setUserDetails((prev) => {
      const next = { ...prev };
      let changed = false;
      for (const k of USER_DETAIL_KEYS) {
        const v = patch[k];
        if (v && String(v).trim() && (next[k] === undefined || next[k] === "")) {
          next[k] = v;
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, []);

  const value = useMemo(
    () => ({
      profile,
      setField,
      userDetails,
      setUserDetail,
      mergeInferredUserDetails,
    }),
    [profile, setField, userDetails, setUserDetail, mergeInferredUserDetails]
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
