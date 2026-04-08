# AIBOU（相棒）

東大志望者向けの目標達成アプリです。

## 技術スタック

- **言語**: TypeScript
- **フレームワーク**: React Native (Expo)
- **スタイリング**: Tailwind CSS (NativeWind)
- **アイコン**: Lucide React Native
- **ルーティング**: Expo Router

## 画面構成（仕様書ベース）

| 画面 | 役割 |
|------|------|
| **スタート** | 目標・現状入力（目標・学年・成績・塾・科目・コマ・学校・部活などのプルダウン）→ 完了でホームへ |
| **ホーム** | 今日の予定・明日の予定・計画修正。AIBOU / スコア / タスクリスト / カレンダーへの入口 |
| **AIBOU** | マスコット画面。食事・睡眠の記録など。トップ（ホーム）に戻る |
| **スコア** | 試験スコア表示。ホームに戻る / タスクリストへ進む |
| **タスクリスト** | 未読・済みのタスク。ホームに戻る / カレンダーへ進む |
| **カレンダー** | 月間カレンダー。ホームに戻る |

## ディレクトリ構造

```
├── app/
│   ├── _layout.tsx        # ルート（Stack: スタート → タブ）
│   ├── index.tsx          # スタート画面
│   └── (tabs)/
│       ├── _layout.tsx    # ボトムタブ（ホーム / AIBOU / スコア / タスク / カレンダー）
│       ├── home.tsx
│       ├── aibou.tsx
│       ├── score.tsx
│       ├── tasklist.tsx
│       └── calendar.tsx
├── components/
│   ├── StartMascot.tsx    # スタート画面マスコット
│   └── DropdownRow.tsx   # プルダウン行
├── types/
│   └── start.ts          # スタート画面の型
├── assets/
├── global.css
├── tailwind.config.js
└── ...
```

## セットアップ

1. 依存関係のインストール

```bash
npm install
```

2. アセット（任意）

`assets/` に `icon.png`・`splash-icon.png`・`adaptive-icon.png` を置くとアプリアイコン・スプラッシュが反映されます。未設定の場合は Expo のデフォルトが使われます。

3. 起動

```bash
npm start
```

Expo Go で QR コードを読み取り、実機またはシミュレータで確認できます。

## 現在の実装状況

- ✅ プロジェクト構成・Expo Router・NativeWind・Lucide のセットアップ
- ✅ スタート画面の見た目（タイトル・マスコット・プルダウン行・「設定してホームへ」）
- ✅ スタート → ホーム（タブ）への遷移
- ✅ 各タブのプレースホルダー画面（ホーム / AIBOU / スコア / タスクリスト / カレンダー）
- 🔲 プルダウンの中身・選択画面の実装
- 🔲 ホーム・スコア・タスクリスト・カレンダー・AIBOU の詳細実装
