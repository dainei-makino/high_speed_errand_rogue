# ハイスピードおつかいローグ – UI / HUD & CameraManager 仕様

> **目的** : 画面に表示するユーザーインターフェース (UI) とゲーム世界を映すカメラ処理をきれいに分離し、誰でも改修できるようにまとめる。高校生でも読めるよう★印で注釈付き。

---

## 0. 仮想解像度とビューポート★

| 項目                    | 数値 / 設定                 | 説明                                   |
| --------------------- | ----------------------- | ------------------------------------ |
| **仮想画面サイズ**           | **480 × 270 px** (16:9) | ゲーム内部の固定座標系。ピクセルアートがにじまない整数比で拡大しやすい。 |
| **Scale モード**         | `Phaser.Scale.FIT`      | 画面に合わせて拡大縮小し、余白は黒帯 (暗闇) でレターボックス。    |
| **roundPixels**       | `true`                  | 拡大時にドットをカリカリに保つ。                     |

> ★ビューポート … プレイヤーが実際に見る「覗き窓」。仮想解像度を等倍 or 整数倍で描画し、ブラウザ幅に合わせて黒帯を追加する方式を **レターボックススケーリング** と呼ぶ。

---

## 1. UI / HUD レイアウト

```
┌─────────────────────────┐  ← 黒帯 (闇)
│ CHUNK 123              │
│ KEY   🔑 / POWER ⚡ 00s │  ← TopBar (高さ: 24px)
├─────────────────────────┤
│                         │
│      (Game View)        │  ← 仮想 480×270, 中央寄せ
│                         │
├─────────────────────────┤
└─────────────────────────┘
```

### 1‑A. 要素一覧 (仮想座標)

| ID               | 名称       | 位置 (x,y) | サイズ    | 更新頻度     | 備考                     |
| ---------------- | -------- | -------- | ------ | -------- | ---------------------- |
| `chunkText`      | チャンク数  | (12, 8)  | 96×16  | 扉通過時    | `CHUNK` + 数字をそのまま表示 |
| `keyIcon`        | 鍵アイコン   | (GW-120, GH-120) | 96×96  | 鍵取得時    | 取得数に応じて表示 |
| `powerText`      | パワーアップ残秒 | (190,8)  | 80×16  | 0.1s 間隔  | 残 0 秒で非表示              |
| `fpsDebug` (dev) | FPS 表示   | (420,8)  | 48×16  | devモードのみ | `text.setVisible(dev)` |

- 文字は **ビットマップフォント** (8×8 px) を 2×拡大してシャープ表示。
- UI はすべて **別 Scene** (`UIScene`) に置き、ゲーム描画 (`GameScene`) とレイヤー分離。

### 1‑B. Responsive (ウィンドウリサイズ)

```ts
this.scale.on('resize', (gw,gh)=>{
  uiScene.cameras.main.setViewport((gw-960)/2, (gh-540)/2, 960, 540);
});
```

UI シーンのカメラを iframe 中央へ再配置し、ゲームシーン側は `ScaleManager` が自動 Fit。

---



## 2. UI とカメラの完全分離を保つポイント

1. **UI は位置を「画面内固定」で計算** … ゲーム座標に依存しない。
2. **ゲーム描画レイヤーだけカメラに追従** … `GameScene` のカメラだけ `pan / zoom` 操作。
3. **イベント駆動**

---

## 3. デバッグスイッチ

| スイッチ名              | 効果                                |
| ------------------ | --------------------------------- |
| `showCameraBounds` | カメラビューポートを緑枠表示                    |
| `uiTestStrings`    | すべての HUD テキストに最大文字を入れてレイアウト崩れチェック |
| `freezeCamera`     | `pan/zoom` を無効にし、UI だけ動かす         |

---

## 4. 用語ミニ辞典

| 用語           | 意味               | 一言メモ        |
| ------------ | ---------------- | ----------- |
| ビューポート       | 画面に表示される矩形領域     | 覗き窓         |
| Scene 分割     | Phaser の画面レイヤー機能 | UI とゲームを別管理 |
| EventEmitter | イベント通知クラス        | シーン間メッセンジャ  |

---

© 2025 Dainei Makino. 本資料はプロジェクトメンバー・教育目的での転載を許可します。

