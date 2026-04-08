/**
 * AIBOU アプリ共通デザイントークン（index / カレンダー等で統一）
 */
import { Platform, type ViewStyle } from "react-native";

export const BACKGROUND = "#F8FAFC";
export const PRIMARY = "#2563EB";
export const PRIMARY_LIGHT = "#EFF6FF";
export const FIXED_SCHEDULE_BG = "#E2E8F0";
export const CUBE_LOCKED_BG = "#2563EB";
export const CUBE_LOCKED_TEXT = "#FFFFFF";

/** Insta / Airbnb 系の洗練UI用（ゴール・データ・モーダル周り） */
export const UI_SCREEN = "#FFFFFF";
export const UI_SURFACE = "#FFFFFF";
export const UI_MUTED = "#F7F7F7";
export const UI_TEXT = "#222222";
export const UI_TEXT_SECONDARY = "#717171";
export const UI_TEXT_TERTIARY = "#B0B0B0";
export const UI_BORDER = "#EBEBEB";
export const UI_RADIUS_XL = 20;
export const UI_RADIUS_LG = 16;
export const UI_RADIUS_MD = 12;
export const UI_RADIUS_SM = 10;

export const uiCardShadow: ViewStyle =
  Platform.OS === "ios"
    ? {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 16,
      }
    : { elevation: 2 };
