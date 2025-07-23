# ハイスピードおつかいローグ

## ドキュメント
- [ゲーム概要 (JA)](docs/game-overview-ja.md)
- [実装ロードマップ (JA)](docs/implementation-roadmap-ja.md)

## Phaser 3 ミニマル環境
本リポジトリには、ブラウザでそのまま動作する最小構成の Phaser 3 環境を同梱しています。

### 使い方
1. このディレクトリで `npx serve` を実行（Node.js が必要）。
2. 表示された URL をブラウザで開くとゲーム画面が表示されます。

`index.html` を直接開くだけでも動作しますが、ローカルサーバーを経由するとアセット追加時も便利です。

### Vercel デプロイ
`vercel.json` を含めているので、Vercel にこのリポジトリをインポートするだけでデプロイできます。
