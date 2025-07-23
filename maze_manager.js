import { createChunk, TILE } from './maze_generator_core.js';
import Characters from './characters.js';

export default class MazeManager {
  constructor(scene) {
    this.scene = scene;
    this.tileSize = 16;
    this.activeChunks = [];
    this.chunkSpacing = 16;
    // Doubled the initial TTL so mazes last longer before fading
    this.fadeDelay = 18000; // ms until fade starts
    this.fadeDuration = 2000; // fade time
    this.events = new Phaser.Events.EventEmitter();
  }

  spawnInitial() {
    const chunk = createChunk('start', 13, 'W');
    this._ensureEntrance(chunk);
    return this.addChunk(chunk, 0, 0);
  }

  addChunk(chunk, offsetX, offsetY) {
    const container = this.scene.add.container(offsetX, offsetY);
    if (this.scene.worldLayer) {
      // Add new chunk containers behind the hero so the character remains visible
      this.scene.worldLayer.addAt(container, 0);
    }
    container.alpha = 0;
    this.scene.tweens.add({ targets: container, alpha: 1, duration: 400 });

    const info = {
      chunk,
      container,
      offsetX,
      offsetY,
      age: 0,
      fading: false,
      doorSprite: null,
      chestSprite: null
    };
    this.renderChunk(chunk, container, info);
    this.activeChunks.push(info);
    this.events.emit('chunk-added', info);
    return info;
  }

  renderChunk(chunk, container, info) {
    const size = this.tileSize;
    for (let y = 0; y < chunk.size; y++) {
      for (let x = 0; x < chunk.size; x++) {
        const tile = chunk.tiles[y * chunk.size + x];
        const floor = Characters.createFloor(this.scene);
        floor.setDisplaySize(size, size);
        floor.setPosition(x * size, y * size);
        container.add(floor);

        let sprite = null;
        switch (tile) {
          case TILE.WALL:
            sprite = Characters.createWall(this.scene);
            break;
          case TILE.DOOR:
            sprite = Characters.createExit(this.scene);
            info.doorSprite = sprite;
            info.doorPosition = { x, y };
            break;
          case TILE.CHEST:
          case TILE.ITEM_CHEST:
            sprite = Characters.createTreasure(this.scene);
            info.chestSprite = sprite;
            info.chestPosition = { x, y };
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
      const cSize = chunk.size;
      if (
        x >= offsetX &&
        y >= offsetY &&
        x < offsetX + cSize * size &&
        y < offsetY + cSize * size
      ) {
        const tx = Math.floor((x - offsetX) / size);
        const ty = Math.floor((y - offsetY) / size);
        const cell = chunk.tiles[ty * cSize + tx];
        return { chunk: obj, cell, tx, ty };
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
    const cSize = chunk.size;
    return (
      heroSprite.x >= offsetX &&
      heroSprite.y >= offsetY &&
      heroSprite.x < offsetX + cSize * size &&
      heroSprite.y < offsetY + cSize * size
    );
  }

  spawnNext(progress, fromObj, heroSprite) {
    const door = fromObj.chunk.door || { dir: 'E', x: fromObj.chunk.size - 1, y: 0 };
    const doorDir = door.dir;
    const entryDir = this._oppositeDir(doorDir);
    const chunk = createChunk(`chunk${progress}`, 13, entryDir);

    const { offsetX, offsetY } = this._calcOffset(fromObj, chunk.size, doorDir);

    const entrance = this._calcEntrance(doorDir, door.x, door.y, chunk.size);
    chunk.tiles[entrance.y * chunk.size + entrance.x] = TILE.FLOOR;
    chunk.entrance = entrance;
    this._ensureEntrance(chunk);

    const info = this.addChunk(chunk, offsetX, offsetY);

    heroSprite.x = offsetX + chunk.entrance.x * this.tileSize + this.tileSize / 2;
    heroSprite.y = offsetY + chunk.entrance.y * this.tileSize + this.tileSize / 2;
    return info;
  }

  _oppositeDir(dir) {
    switch (dir) {
      case 'N':
        return 'S';
      case 'S':
        return 'N';
      case 'W':
        return 'E';
      case 'E':
      default:
        return 'W';
    }
  }

  _calcOffset(fromObj, newSize, dir) {
    const size = this.tileSize;
    let offsetX = fromObj.offsetX;
    let offsetY = fromObj.offsetY;
    switch (dir) {
      case 'N':
        offsetY = fromObj.offsetY - (newSize - 1) * size;
        break;
      case 'S':
        offsetY = fromObj.offsetY + (fromObj.chunk.size - 1) * size;
        break;
      case 'W':
        offsetX = fromObj.offsetX - (newSize - 1) * size;
        break;
      case 'E':
      default:
        offsetX = fromObj.offsetX + (fromObj.chunk.size - 1) * size;
        break;
    }
    return { offsetX, offsetY };
  }

  _calcEntrance(dir, doorX, doorY, newSize) {
    switch (dir) {
      case 'N':
        return { x: doorX, y: newSize - 1 };
      case 'S':
        return { x: doorX, y: 0 };
      case 'W':
        return { x: newSize - 1, y: doorY };
      case 'E':
      default:
        return { x: 0, y: doorY };
    }
  }

  _ensureEntrance(chunk) {
    if (chunk.entrance) return;
    const floors = [];
    const size = chunk.size;
    for (let y = 1; y < size - 1; y++) {
      for (let x = 1; x < size - 1; x++) {
        if (chunk.tiles[y * size + x] === TILE.FLOOR) {
          floors.push({ x, y });
        }
      }
    }
    chunk.entrance = floors[Math.floor(Math.random() * floors.length)] || { x: 1, y: 1 };
  }

  openDoor(info) {
    if (info && info.doorSprite) {
      info.doorSprite.setTexture('door_open');
    }
  }

  removeChest(info) {
    if (info && info.chestSprite) {
      this.scene.tweens.add({
        targets: info.chestSprite,
        alpha: 0,
        duration: 200,
        onComplete: () => {
          info.chestSprite.destroy();
          info.chestSprite = null;
        }
      });
    }
  }
}
