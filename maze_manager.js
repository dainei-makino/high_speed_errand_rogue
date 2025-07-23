import { generateChunk } from './maze.js';
import Characters from './characters.js';

export default class MazeManager {
  constructor(scene) {
    this.scene = scene;
    this.tileSize = 16;
    this.activeChunks = [];
    this.chunkSpacing = 16;
    this.fadeDelay = 8000; // ms until fade starts
    this.fadeDuration = 2000; // fade time
    this.events = new Phaser.Events.EventEmitter();
  }

  spawnInitial() {
    const chunk = generateChunk(0);
    return this.addChunk(chunk, 0, 0);
  }

  addChunk(chunk, offsetX, offsetY) {
    const container = this.scene.add.container(offsetX, offsetY);
    if (this.scene.worldLayer) {
      this.scene.worldLayer.add(container);
    }
    container.alpha = 0;
    this.scene.tweens.add({ targets: container, alpha: 1, duration: 400 });

    this.renderChunk(chunk, container);
    const info = { chunk, container, offsetX, offsetY, age: 0, fading: false };
    this.activeChunks.push(info);
    this.events.emit('chunk-added', info);
    return info;
  }

  renderChunk(chunk, container) {
    const size = this.tileSize;
    for (let y = 0; y < chunk.height; y++) {
      for (let x = 0; x < chunk.width; x++) {
        const cell = chunk.tiles[y][x];
        // always draw base floor
        const floor = Characters.createFloor(this.scene);
        floor.setDisplaySize(size, size);
        floor.setPosition(x * size, y * size);
        container.add(floor);

        let sprite = null;
        switch (cell.type) {
          case 'wall':
            sprite = Characters.createWall(this.scene);
            break;
          case 'exit':
            sprite = Characters.createExit(this.scene);
            break;
          case 'chest':
          case 'itemChest':
            sprite = Characters.createTreasure(this.scene);
            break;
          // entrance and floor just use floor graphic
        }

        if (sprite) {
          sprite.setDisplaySize(size, size);
          sprite.setPosition(x * size, y * size);
          sprite.setData('type', cell.type);
          container.add(sprite);
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
    const info = this.addChunk(chunk, offsetX, offsetY);

    heroSprite.x = offsetX + chunk.entrance.x * this.tileSize + this.tileSize / 2;
    heroSprite.y = offsetY + chunk.entrance.y * this.tileSize + this.tileSize / 2;
    return info;
  }
}
