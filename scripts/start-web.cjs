#!/usr/bin/env node
/**
 * Web 開発サーバー起動（相棒 / AIBOU）
 *
 * 主な不具合:
 * - 一部環境で Bonjour が失敗して起動できない
 * - 一部環境で watcher 上限 (EMFILE) により起動できない
 *
 * 対策:
 * - Bonjour を無効化する
 * - 既定はファイル監視あり（保存でホットリロード）。watcher 上限 (EMFILE) で落ちる環境だけ AIBOU_DISABLE_WATCH=1
 * - Cursor のブラウザ等で古いバンドルが残るのを防ぐため、既定で expo --clear（速さ優先なら AIBOU_WEB_NO_CLEAR=1）
 * - 明示: npm run web:clear
 */

const { spawnSync } = require("child_process");

const env = { ...process.env };
// Some environments cannot enumerate network interfaces reliably.
// Disable Bonjour advertisement to prevent startup failure.
env.EXPO_UNSTABLE_BONJOUR = "0";
if (env.AIBOU_DISABLE_WATCH === "1") {
  env.CI = "1";
  env.CONTINUOUS_INTEGRATION = "1";
}

const rawArgs = process.argv.slice(2);
const wantsClear = rawArgs.includes("--clear") || rawArgs.includes("-c");
const forwarded = rawArgs.filter((a) => a !== "--clear" && a !== "-c");

const expoArgs = ["expo", "start", "--web"];
if (wantsClear || env.AIBOU_WEB_NO_CLEAR !== "1") {
  expoArgs.push("--clear");
}
expoArgs.push(...forwarded);

console.log(
  "\n\x1b[90m[AIBOU 本体]\x1b[0m 高二・KOKO2 用アプリです。富原パーソナル版は \x1b[33mnpm run web:personal\x1b[0m → http://127.0.0.1:8082",
  env.AIBOU_WEB_NO_CLEAR === "1"
    ? "\n  \x1b[90m（AIBOU_WEB_NO_CLEAR=1 · --clear なし）\x1b[0m"
    : "\n  \x1b[90m（既定 expo --clear · 古い表示を抑止。速くしたいだけなら AIBOU_WEB_NO_CLEAR=1）\x1b[0m",
  "\n"
);

const result = spawnSync("npx", expoArgs, {
  stdio: "inherit",
  env,
  shell: process.platform === "win32",
});

process.exit(result.status ?? 1);
