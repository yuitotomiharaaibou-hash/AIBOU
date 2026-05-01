/** 自然言語の意図を、一覧に載せたタスク id へ落とした調整（AI JSON と適用層で共有） */
export type AiTaskAdjustmentPatch = { id: string; date: string; hour?: number };
