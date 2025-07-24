# ハイスピードおつかいローグ

## ドキュメント
- [ゲーム概要 (JA)](docs/game-overview-ja.md)
- [新チャンク配置ロジック (JA)](docs/chunk_placement_logic.md)
- [迷路関連ロジックまとめ](docs/maze_logic_index.md)

## Phaser 3 ミニマル環境
本リポジトリには、ブラウザでそのまま動作する最小構成の Phaser 3 環境を同梱しています。

### 使い方
1. このディレクトリで `npx serve` を実行（Node.js が必要）。
2. 表示された URL をブラウザで開くとゲーム画面が表示されます。

`index.html` を直接開くだけでも動作しますが、ローカルサーバーを経由するとアセット追加時も便利です。

### Vercel デプロイ
`vercel.json` を含めているので、Vercel にこのリポジトリをインポートするだけでデプロイできます。

### アセット配置
画像ファイルは `assets/images/`、サウンドファイルは `assets/sounds/` 以下に配置してください。
