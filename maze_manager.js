export default class MazeManager {
  constructor(scene, gameState, tileSize = 32) {
    this.scene = scene;
    this.gameState = gameState;
    this.tileSize = tileSize;
    this.chunks = [];
  }

  addChunk(chunk, x, y) {
    const cont = this.scene.add.container(x, y);
    for (let j = 0; j < chunk.height; j++) {
      for (let i = 0; i < chunk.width; i++) {
        const cell = chunk.tiles[j][i];
        const color = this._colorFor(cell.type);
        const rect = this.scene.add.rectangle(i * this.tileSize, j * this.tileSize,
          this.tileSize, this.tileSize, color).setOrigin(0);
        cont.add(rect);
        cell.rect = rect;
      }
    }
    chunk.container = cont;
    this.chunks.push({ chunk, x, y });
    return this.chunks[this.chunks.length - 1];
  }

  _colorFor(type) {
    switch (type) {
      case 'entrance':
        return 0x008800;
      case 'exit':
        return 0xaa0000;
      case 'chest':
        return 0xffff00;
      case 'itemChest':
        return 0xff00ff;
      default:
        return 0x444444;
    }
  }

  worldPos(chunkObj, cellX, cellY) {
    return {
      x: chunkObj.x + cellX * this.tileSize,
      y: chunkObj.y + cellY * this.tileSize
    };
  }

  fadeOldChunks(activeChunk) {
    const threshold = 5000; // ms
    for (const obj of this.chunks) {
      obj.chunk.age += this.scene.game.loop.delta;
      if (!obj.chunk.fading && obj.chunk !== activeChunk && obj.chunk.age > threshold) {
        obj.chunk.fading = true;
        this.scene.tweens.add({
          targets: obj.chunk.container,
          alpha: 0,
          duration: 1000,
          onComplete: () => {
            obj.chunk.container.destroy();
            obj.removed = true;
            const idx = this.chunks.indexOf(obj);
            if (idx !== -1) this.chunks.splice(idx, 1);
            if (activeChunk === obj.chunk) {
              this.scene.gameOver();
            }
          }
        });
      }
    }
  }
}
