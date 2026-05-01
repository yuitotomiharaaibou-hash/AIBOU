/** タブバー分の下端余白（概算） */
export const TAB_BAR_RESERVE = 54;
export const PLUS_FAB_SIZE = 56;
/** 相棒 FAB の直径（AibouCompanionFab の SIZE と一致させる） */
export const COMPANION_FAB_SIZE = 64;
/** 相棒と＋のあいだ */
export const FAB_STACK_GAP = 22;

/**
 * タブ寄り（下）：相棒 FAB
 */
export function getCompanionFabBottom(safeAreaBottom: number): number {
  return 16 + Math.max(safeAreaBottom, 10) + TAB_BAR_RESERVE;
}

/**
 * 相棒の上：＋ボタン
 */
export function getPlusFabBottom(safeAreaBottom: number): number {
  return getCompanionFabBottom(safeAreaBottom) + COMPANION_FAB_SIZE + FAB_STACK_GAP;
}
