#!/usr/bin/env node
/**
 * Web 開発サーバー起動（相棒 / AIBOU）
 *
 * 根絶したい不具合:
 * - CI=true のとき Expo は「リロード無効」モードになり、保存してもブラウザが更新されない
 * - Metro のキャッシュが古いと localhost:8081 が昔のバンドルのままに見える
 *
 * 対策:
 * - このスクリプトは CI / CONTINUOUS_INTEGRATION を除去してから expo を起動する
 * - キャッシュを捨てたいときは: npm run web:clear
 * - ブラウザ側は状況によっては スーパーリロード (Cmd+Shift+R) も有効
 */

const { spawnSync } = require("child_process");

const env = { ...process.env };
delete env.CI;
delete env.CONTINUOUS_INTEGRATION;

const rawArgs = process.argv.slice(2);
const wantsClear = rawArgs.includes("--clear") || rawArgs.includes("-c");
const forwarded = rawArgs.filter((a) => a !== "--clear" && a !== "-c");

const expoArgs = ["expo", "start", "--web"];
if (wantsClear) expoArgs.push("--clear");
expoArgs.push(...forwarded);

const result = spawnSync("npx", expoArgs, {
  stdio: "inherit",
  env,
  shell: process.platform === "win32",
});

process.exit(result.status ?? 1);
