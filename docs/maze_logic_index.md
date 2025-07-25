# 迷路関連ロジックまとめ

迷路を生成・管理するロジックを以下の5種類に分類した。

1. **チャンク配置ロジック**
   - [chunk_placement_logic.md](chunk_placement_logic.md)
2. **チャンク内の迷路生成ロジック**
   - [maze_generation_logic.md](maze_generation_logic.md)
3. **迷路内アイテム配置ロジック**
   - [maze_item_placement_logic.md](maze_item_placement_logic.md)
4. **チャンク確定・上書きロジック**
   - [maze_chunk_finalize_logic.md](maze_chunk_finalize_logic.md)
5. **迷路寿命ロジック**
   - [maze_extinction.md](maze_extinction.md)

これらを順に実行することで、迷路が生成されアイテムが配置され、最終的なチャンクとしてゲームに反映される。

