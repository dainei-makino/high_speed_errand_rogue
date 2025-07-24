# タイトル画面とロード画面の仕組み

> **目的** : 起動直後のロード表示からゲーム開始までの流れを理解し、必要に応じて改修できるようにする。

---

## 1. 画面遷移の概要

```
BootScene  →  TitleScene  →  GameScene + UIScene
   ▲             │                │
   └── 音声・画像読込 ─┘      └─ 実際のゲーム処理
```

1. **BootScene** – 黒背景に “LOADING...” を表示しながら音声を読み込む。
   画像は `characters.js` の `ready` Promise を通して取得する。
2. 読み込みが完了すると `Characters.registerTextures()` でテクスチャを登録し、続いて **TitleScene** へ遷移する。
3. **TitleScene** – `GameScene` をバックグラウンドで起動して即座に一時停止し、
   初期チャンクと主人公キャラが静止した状態で表示される。
4. WASD いずれかのキーが押されると `UIScene` を起動し `GameScene` を再開。タイトル表示を消してゲーム本編が始まる。

## 2. 初期迷路と主人公の表示方法

`TitleScene` の `create()` 内で `GameScene` を起動してからすぐに一時停止することで、
ゲームの最初の状態をそのまま背景として利用している。具体的には次の順序で処理を行う。

```javascript
const gs = this.scene.get('GameScene');
// GameScene の create 完了を待ってから停止
gs.events.once('create', () => {
  this.scene.pause('GameScene');
  this.scene.sendToBack('GameScene');
});
// 裏で GameScene を立ち上げる
this.scene.launch('GameScene');
```

この方法により、タイトル文字だけを重ねた状態で初期迷路と主人公が静止表示される。
ゲーム開始時には `resume('GameScene')` でそのまま動き出すため、シームレスな遷移が可能となる。

---

## 3. カスタマイズのポイント

- タイトルテキストや背景色は `title_scene.js` 内で調整できる。
- BootScene で読み込むアセットを追加したい場合は `boot_scene.js` の `preload()` に追記する。
- ゲーム中の UI 表示は `UIScene` が担当しているため、タイトルからゲームへ移行した後に初期化が必要な場合は `UIScene` の `create()` を参照。
- ウィンドウサイズ変更時は `scale.on('resize')` でビューポートを再計算している。
