import { createChunk, TILE } from './maze_generator_core.js';
import Characters from './characters.js';
import { pickMazeConfig } from './maze_table.js';

export default class MazeManager {
  constructor(scene) {
    this.scene = scene;
    this.tileSize = 16;
    this.activeChunks = [];
    this.chunkSpacing = 16;
    // Use a random base for seeds so mazes differ each run
    this.seedBase = Math.random().toString(36).slice(2);
    this.seedCount = 0;
    // Doubled the initial TTL so mazes last longer before fading
    this.fadeDelay = 18000; // ms until fade starts
    this.fadeDuration = 2000; // fade time
    this.events = new Phaser.Events.EventEmitter();
  }

  _nextSeed() {
    return `${this.seedBase}-${this.seedCount++}`;
  }

  spawnInitial() {
    const { size } = pickMazeConfig(1);
    const chunk = createChunk(this._nextSeed(), size, 'W');
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
          case TILE.SILVER_DOOR:
            sprite = Characters.createSilverDoor(this.scene);
            info.silverDoorSprite = sprite;
            info.silverDoorPosition = { x, y };
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
    const { size } = pickMazeConfig(progress + 1);
    let chunk = null;
    let offsetX = 0;
    let offsetY = 0;
    const orientTries = 4;
    const sizeAdjustTries = 2;
    let success = false;

    let baseSize = size;
    for (let adjust = 0; adjust <= sizeAdjustTries && !success; adjust++) {
      if (adjust > 0) {
        baseSize = Math.max(5, baseSize - 2);
      }
      for (let i = 0; i < orientTries && !success; i++) {
        chunk = createChunk(this._nextSeed(), baseSize, entryDir);
        ({ offsetX, offsetY } = this._calcOffset(fromObj, chunk.size, doorDir));

        let attempts = 0;
        while (
          this._isOverlap(offsetX, offsetY, chunk.size, null, fromObj) &&
          attempts < 3
        ) {
          switch (doorDir) {
            case 'N':
              offsetY -= this.tileSize;
              break;
            case 'S':
              offsetY += this.tileSize;
              break;
            case 'W':
              offsetX -= this.tileSize;
              break;
            case 'E':
            default:
              offsetX += this.tileSize;
              break;
          }
          attempts += 1;
        }
        if (
          !this._isOverlap(offsetX, offsetY, chunk.size, null, fromObj) &&
          this._canSpawnChain(offsetX, offsetY, chunk, progress, fromObj)
        ) {
          success = true;
        }
      }
    }

    if (!success) {
      const gap = this._createGapChunk(entryDir, fromObj, doorDir);
      chunk = gap.chunk;
      offsetX = gap.offsetX;
      offsetY = gap.offsetY;
    }

    const doorWorldX = fromObj.offsetX + door.x * this.tileSize;
    const doorWorldY = fromObj.offsetY + door.y * this.tileSize;

    const entrance = this._calcEntrance(doorDir, door.x, door.y, chunk.size);

    // Adjust position so entrance never lands on a corner
    if (doorDir === 'N' || doorDir === 'S') {
      const minX = 1;
      const maxX = chunk.size - 2;
      let adjX = door.x;
      if (adjX < minX) adjX = minX;
      if (adjX > maxX) adjX = maxX;
      if (adjX !== door.x) {
        entrance.x = adjX;
        offsetX = doorWorldX - adjX * this.tileSize;
      }
    } else {
      const minY = 1;
      const maxY = chunk.size - 2;
      let adjY = door.y;
      if (adjY < minY) adjY = minY;
      if (adjY > maxY) adjY = maxY;
      if (adjY !== door.y) {
        entrance.y = adjY;
        offsetY = doorWorldY - adjY * this.tileSize;
      }
    }
    chunk.tiles[entrance.y * chunk.size + entrance.x] = TILE.FLOOR;
    const inner = { x: entrance.x, y: entrance.y };
    switch (doorDir) {
      case 'N':
        inner.y = entrance.y - 1;
        break;
      case 'S':
        inner.y = entrance.y + 1;
        break;
      case 'W':
        inner.x = entrance.x - 1;
        break;
      case 'E':
      default:
        inner.x = entrance.x + 1;
        break;
    }
    if (
      inner.x >= 0 &&
      inner.x < chunk.size &&
      inner.y >= 0 &&
      inner.y < chunk.size
    ) {
      const idx = inner.y * chunk.size + inner.x;
      const t = chunk.tiles[idx];
      if (t !== TILE.CHEST && t !== TILE.ITEM_CHEST) {
        chunk.tiles[idx] = TILE.FLOOR;
      }
    }
    chunk.entrance = entrance;
    this._ensureEntrance(chunk);
    if (progress >= 1) {
      this._addSilverDoor(chunk);
    }

    const info = this.addChunk(chunk, offsetX, offsetY);

    heroSprite.x = offsetX + chunk.entrance.x * this.tileSize + this.tileSize / 2;
    heroSprite.y = offsetY + chunk.entrance.y * this.tileSize + this.tileSize / 2;

    this.events.emit('spawn-next', {
      doorDir,
      doorWorldX,
      doorWorldY,
      info
    });

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

  _isOverlap(x, y, size, extra, ignore) {
    const ts = this.tileSize;
    const newLeft = x;
    const newTop = y;
    const newRight = x + size * ts;
    const newBottom = y + size * ts;

    const check = obj => {
      const exLeft = obj.offsetX;
      const exTop = obj.offsetY;
      const exRight = exLeft + obj.chunk.size * ts;
      const exBottom = exTop + obj.chunk.size * ts;
      return (
        newLeft < exRight &&
        newRight > exLeft &&
        newTop < exBottom &&
        newBottom > exTop
      );
    };

    for (const obj of this.activeChunks) {
      if (
        (ignore && (Array.isArray(ignore) ? ignore.includes(obj) : obj === ignore))
      ) {
        continue;
      }
      if (check(obj)) {
        return true;
      }
    }
    if (extra && check(extra)) {
      return true;
    }
    return false;
  }

  _canSpawnChain(x, y, chunk, progress, ignore) {
    const steps = 2;
    const testSize = pickMazeConfig(Math.max(1, progress + 1)).size;
    let obj = { offsetX: x, offsetY: y, chunk };
    const dir = chunk.door ? chunk.door.dir : 'E';
    for (let i = 0; i < steps; i++) {
      const next = this._calcOffset(obj, testSize, dir);
      if (this._isOverlap(next.offsetX, next.offsetY, testSize, obj, ignore)) {
        return false;
      }
      obj = { offsetX: next.offsetX, offsetY: next.offsetY, chunk: { size: testSize } };
    }
    return true;
  }

  _createGapChunk(entryDir, fromObj, incomingDir) {
    const size = 5;
    const seed = this._nextSeed() + '-gap';
    const chunk = createChunk(seed, size, entryDir);
    const t = chunk.tiles;
    t.fill(TILE.WALL);
    const c = Math.floor(size / 2);
    for (let i = 1; i < size - 1; i++) {
      t[c * size + i] = TILE.FLOOR;
      t[i * size + c] = TILE.FLOOR;
    }
    chunk.chest = { x: c, y: c };
    t[c * size + c] = TILE.CHEST;

    const { offsetX, offsetY } = this._calcOffset(fromObj, size, incomingDir);
    const candidates = ['N', 'E', 'S', 'W'].filter(d => d !== entryDir);
    const testSize = pickMazeConfig(1).size;
    let doorDir = this._oppositeDir(entryDir);
    for (const dir of candidates) {
      const pos = this._calcOffset(
        { offsetX, offsetY, chunk: { size } },
        testSize,
        dir
      );
      if (
        !this._isOverlap(
          pos.offsetX,
          pos.offsetY,
          testSize,
          { offsetX, offsetY, chunk: { size } },
          fromObj
        )
      ) {
        doorDir = dir;
        break;
      }
    }

    let door;
    switch (doorDir) {
      case 'N':
        door = { dir: 'N', x: c, y: 0 };
        break;
      case 'S':
        door = { dir: 'S', x: c, y: size - 1 };
        break;
      case 'W':
        door = { dir: 'W', x: 0, y: c };
        break;
      case 'E':
      default:
        door = { dir: 'E', x: size - 1, y: c };
        break;
    }
    chunk.door = door;
    t[door.y * size + door.x] = TILE.DOOR;
    chunk.entrance = this._calcEntrance(door.dir, door.x, door.y, size);
    return { chunk, offsetX, offsetY };
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

  _addSilverDoor(chunk) {
    const candidates = [];
    const size = chunk.size;
    const t = chunk.tiles;
    for (let y = 1; y < size - 1; y++) {
      for (let x = 1; x < size - 1; x++) {
        if (t[y * size + x] !== TILE.WALL) continue;
        const n = t[(y - 1) * size + x];
        const s = t[(y + 1) * size + x];
        const e = t[y * size + (x + 1)];
        const w = t[y * size + (x - 1)];
        const horiz = e !== TILE.WALL && w !== TILE.WALL && n === TILE.WALL && s === TILE.WALL;
        const vert = n !== TILE.WALL && s !== TILE.WALL && e === TILE.WALL && w === TILE.WALL;
        if (horiz || vert) {
          candidates.push({ x, y });
        }
      }
    }
    if (candidates.length) {
      const spot = candidates[Math.floor(Math.random() * candidates.length)];
      chunk.tiles[spot.y * size + spot.x] = TILE.SILVER_DOOR;
      chunk.silverDoor = spot;
    }
  }

  openDoor(info) {
    if (info && info.doorSprite) {
      info.doorSprite.setTexture('door_open');
    }
  }

  openSilverDoor(info) {
    if (info && info.silverDoorSprite) {
      info.silverDoorSprite.setTexture('door_silver_open');
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
