import { generateChunk, TILE_TYPES } from './maze.js';
import Characters from './characters.js';

export default class MazeManager {
  constructor(scene) {
    this.scene = scene;
    this.tileSize = 16;
    this.activeChunks = [];
    this.chunkSpacing = 16;
    this.baseTTL = 12000;
    this.minTTL = 6000;
  }

  spawnInitial() {
    const chunk = generateChunk(0);
    this.addChunk(chunk, 0, 0, 0);
    return chunk;
  }

  _calcTTL(progress) {
    const dec = Math.floor(progress / 5) * 1000;
    return Math.max(this.baseTTL - dec, this.minTTL);
  }

  addChunk(chunk, offsetX, offsetY, progress = 0) {
    const container = this.scene.add.container(offsetX, offsetY);
    if (this.scene.worldLayer) {
      this.scene.worldLayer.add(container);
    }
    container.alpha = 0;
    this.scene.tweens.add({ targets: container, alpha: 1, duration: 400 });

    this.renderChunk(chunk, container);
    const ttl = this._calcTTL(progress);
    const bloom = ttl * 0.1;
    const fadeOut = ttl - bloom;
    this.activeChunks.push({
      chunk,
      container,
      offsetX,
      offsetY,
      age: 0,
      bloom,
      fadeOut,
      ttl,
      bloomStarted: false,
      fading: false
    });
  }

  renderChunk(chunk, container) {
    const size = this.tileSize;
    for (let y = 0; y < chunk.height; y++) {
      for (let x = 0; x < chunk.width; x++) {
        const idx = y * chunk.width + x;
        const cell = chunk.tiles[idx];
        const floor = Characters.createFloor(this.scene);
        floor.setDisplaySize(size, size);
        floor.setPosition(x * size, y * size);
        container.add(floor);

        let sprite = null;
        switch (cell) {
          case TILE_TYPES.WALL:
            sprite = Characters.createWall(this.scene);
            break;
          case TILE_TYPES.DOOR:
            sprite = Characters.createExit(this.scene);
            break;
          case TILE_TYPES.KEY_CHEST:
          case TILE_TYPES.ITEM_CHEST:
            sprite = Characters.createTreasure(this.scene);
            break;
        }

        if (sprite) {
          sprite.setDisplaySize(size, size);
          sprite.setPosition(x * size, y * size);
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
        const idx = ty * chunk.width + tx;
        return { chunk: obj, cell: chunk.tiles[idx], tx, ty };
      }
    }
    return null;
  }

  update(delta, hero) {
    for (const obj of this.activeChunks) {
      obj.age += delta;
      if (!obj.bloomStarted && obj.age >= obj.ttl - obj.fadeOut - obj.bloom) {
        obj.bloomStarted = true;
        // quick flash effect before fade out
        this.scene.tweens.add({ targets: obj.container, alpha: 1, duration: obj.bloom });
      }

      if (!obj.fading && obj.age >= obj.ttl - obj.fadeOut) {
        obj.fading = true;
        this.scene.tweens.add({
          targets: obj.container,
          alpha: 0,
          duration: obj.fadeOut,
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
    this.addChunk(chunk, offsetX, offsetY, progress);

    heroSprite.x = offsetX + chunk.entrance.x * this.tileSize + this.tileSize / 2;
    heroSprite.y = offsetY + chunk.entrance.y * this.tileSize + this.tileSize / 2;
    this.scene.cameras.main.pan(heroSprite.x, heroSprite.y, 400);
  }
}
