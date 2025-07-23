import { generateChunk } from './maze.js';

export default class MazeManager {
  constructor(scene) {
    this.scene = scene;
    this.tileSize = 16;
    this.activeChunks = [];
    this.chunkSpacing = 16;
    this.fadeDelay = 8000; // ms until fade starts
    this.fadeDuration = 2000; // fade time
  }

  spawnInitial() {
    const chunk = generateChunk(0);
    this.addChunk(chunk, 0, 0);
    return chunk;
  }

  addChunk(chunk, offsetX, offsetY) {
    const container = this.scene.add.container(offsetX, offsetY);
    if (this.scene.worldLayer) {
      this.scene.worldLayer.add(container);
    }
    container.alpha = 0;
    this.scene.tweens.add({ targets: container, alpha: 1, duration: 400 });

    this.renderChunk(chunk, container);
    this.activeChunks.push({ chunk, container, offsetX, offsetY, age: 0, fading: false });
  }

  renderChunk(chunk, container) {
    const size = this.tileSize;
    for (let y = 0; y < chunk.height; y++) {
      for (let x = 0; x < chunk.width; x++) {
        const cell = chunk.tiles[y][x];
        let color;
        switch (cell.type) {
          case 'wall':
            color = 0x222222;
            break;
          case 'entrance':
            color = 0x0000ff;
            break;
          case 'exit':
            color = 0xff0000;
            break;
          case 'chest':
            color = 0xffff00;
            break;
          case 'itemChest':
            color = 0xff00ff;
            break;
          default:
            color = 0x666666;
        }
        if (cell.type !== 'floor') {
          const rect = this.scene.add.rectangle(
            x * size + size / 2,
            y * size + size / 2,
            size,
            size,
            color
          );
          rect.setOrigin(0.5);
          rect.setData('type', cell.type);
          container.add(rect);
        }
      }
    }
  }

  worldToTile(x, y) {
    const size = this.tileSize;
    for (const obj of this.activeChunks) {
      const { chunk, offsetX, offsetY } = obj;
      if (x >= offsetX && y >= offsetY && x < offsetX + chunk.width * size && y < offsetY + chunk.height * size) {
        const tx = Math.floor((x - offsetX) / size);
        const ty = Math.floor((y - offsetY) / size);
        return { chunk: obj, cell: chunk.tiles[ty][tx], tx, ty };
      }
    }
    return null;
  }

  update(delta, hero) {
    for (const obj of this.activeChunks) {
      obj.age += delta;
      if (obj.age > this.fadeDelay && !obj.fading) {
        obj.fading = true;
        this.scene.tweens.add({
          targets: obj.container,
          alpha: 0,
          duration: this.fadeDuration,
          onComplete: () => {
            if (this.isHeroInside(hero, obj)) {
              this.scene.scene.restart();
            }
            obj.container.destroy();
            this.activeChunks = this.activeChunks.filter(c => c !== obj);
          }
        });
      }
    }
  }

  isHeroInside(heroSprite, obj) {
    const size = this.tileSize;
    const { offsetX, offsetY, chunk } = obj;
    return (
      heroSprite.x >= offsetX &&
      heroSprite.y >= offsetY &&
      heroSprite.x < offsetX + chunk.width * size &&
      heroSprite.y < offsetY + chunk.height * size
    );
  }

  spawnNext(progress, fromObj, heroSprite) {
    const last = this.activeChunks[this.activeChunks.length - 1];
    const offsetX = last.offsetX + last.chunk.width * this.tileSize + this.chunkSpacing;
    const offsetY = last.offsetY;
    const chunk = generateChunk(progress);
    this.addChunk(chunk, offsetX, offsetY);

    heroSprite.x = offsetX + chunk.entrance.x * this.tileSize + this.tileSize / 2;
    heroSprite.y = offsetY + chunk.entrance.y * this.tileSize + this.tileSize / 2;
    this.scene.cameras.main.pan(heroSprite.x, heroSprite.y, 400);
  }
}
