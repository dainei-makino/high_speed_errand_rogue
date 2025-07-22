# ハイスピードおつかいローグ – 実装ロードマップ

> **目的**: Vercel で公開可能な MVP を 2 週間以内に完成させ、その後 2 週間で演出とランキング機能を追加し v1.0 をリリースする。

---

## 1. フェーズ概要

| Phase                 | 期間 (目安)   | ゴール                               | 主担当モジュール               |
| --------------------- | --------- | --------------------------------- | ---------------------- |
| **P0** 環境構築           | Day 1     | リポジトリ + Vercel 自動デプロイ動作           | DevOps                 |
| **P1** コアゲーム MVP      | Day 1–5   | 5×5 迷路 1 チャンク → 無限拡張・フェード・ゲームオーバー | Maze / Player / Camera |
| **P2** ゲームループ確立       | Day 6–10  | パワーアップ宝箱 / 変動サイズ迷路 / スコア UI       | PowerUp / UI           |
| **P3** ビジュアル & サウンド   | Day 11–14 | ネオン演出・BGM ループ・SE 実装               | FX / Audio             |
| **P4** 拡張機能 & QA      | Day 15–21 | ランキング API・難易度スケーリング・E2E テスト       | Backend / QA           |
| **P5** リリース & ポストモーテム | Day 22–28 | v1.0 リリース後、分析 & バグフィックス           | DevOps / All           |

---

## 2. 詳細タスク一覧

### P0. 環境構築 (Day 1)

1. **Repo 初期化**: `/apps/web` (Next.js + TypeScript) `/packages/game` (Phaser ESModules)
2. **CI/CD**: GitHub Actions → Vercel Preview / Production
3. **Lint/Format**: ESLint, Prettier, Husky pre‑commit
4. **Absolute Import**: `@/game`, `@/ui`, `@/lib`

### P1. コアゲーム MVP (Day 1–5)

| Day | タスク                          | ファイル           | Codex 依頼キーワード                    |
| --- | ---------------------------- | -------------- | -------------------------------- |
| 1   | Phaser bootstrap + GameScene | `Game.ts`      | “Phaser boilerplate with camera” |
| 2   | DFS 迷路生成 util                | `maze.ts`      | “generate 5x5 grid as 1‑D array” |
| 3   | プレイヤー入力 & 移動                 | `player.ts`    | “arrow keys grid move”           |
| 4   | 出口判定→新チャンク生成                 | `chunk.ts`     | “spawn next maze and scroll”     |
| 5   | チャンクフェード & GameOver          | `chunkFade.ts` | “alpha decay per frame”          |

### P2. ゲームループ確立 (Day 6–10)

- **宝箱種別** (`gold`, `speed`, `phase`)、Pickup エフェクト
- **パワーアップ状態管理** (`player.state`)
- **迷路サイズ RNG** (5,7,10)
- **Score & Timer UI** (`React Portal` over Canvas)

### P3. ビジュアル & サウンド (Day 11–14)

- **HSL ネオンパレット** helper
- **Tween/Particle**: 取得スパーク・壁衝突フラッシュ
- **Tone.js**: 128 BPM 4‑bar ループ、UI ボタンで Mute
- **SE**: Pickup/Warning/Hit via `Synth` + `Noise`

### P4. 拡張機能 & QA (Day 15–21)

- **Edge Function**: `/api/score` (Upstash Redis)
- **ランキング UI** (`ScoreBoard.tsx`)
- **難易度曲線**: チャンク TTL 減少、迷路サイズローテ
- **Playwright**: 主要フロー E2E

### P5. リリース & ポストモーテム (Day 22–28)

- **v1.0 Tag** → プロダクション
- **Analytics**: Vercel Web Analytics + custom events
- **バグ修正** & **ドキュメント整備** (`README`, `CONTRIBUTING`)

---

## 3. ディレクトリ構成 (案)

```txt
root/
├─ apps/
│  └─ web/          # Next.js (UI, routing)
├─ packages/
│  └─ game/         # Pure TS game engine code
├─ public/
│  └─ assets/       # img/sfx/bgm
├─ vercel.json      # Edge config
└─ .github/workflows/
```

---

## 4. Codex コミュニケーション指針

1. **1 機能 = 1 プロンプト**: 例「DFS で迷路生成 util を実装して」。
2. **完了後にテストコード**: Codex に “Jest で単体テスト書いて” と追依頼。
3. **エラーは丸ごと貼る**: Stack trace をそのまま提示し解決策を得る。

---

## 5. テスト & 品質保証

- **Unit**: Jest, 迷路生成・フェード計算
- **Integration**: React Testing Library, UI コンポーネント
- **E2E**: Playwright (移動→宝箱→GameOver シナリオ)

---

## 6. リスク & 対策

| リスク             | 影響           | 対策                              |
| --------------- | ------------ | ------------------------------- |
| フェード計算が重い       | FPS 低下       | Off‑screen Canvas + batch draw  |
| 音関連のブラウザ互換      | 音が鳴らない       | Web Audio fallback, Mute オプション  |
| Edge DB 限定プラン制限 | ランキング API 制限 | 1 日 1 ユーザ 10 submit まで throttle |

---

## 7. 完了定義 (Definition of Done)

- GitHub main へ merge で Vercel Production に自動公開
- 主要ブラウザ (Chrome, Safari, Edge) 60 FPS 以上
- Google PageSpeed LCP < 2.5 s (Desktop)
- README にビルド手順・操作説明を掲載

---

© 2025 Dainei Makino. All rights reserved.

