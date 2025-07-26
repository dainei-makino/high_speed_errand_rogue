import { createChunk, TILE } from './maze_generator_core.js';
import Characters from './characters.js';
import { pickMazeConfig } from './maze_table.js';
import { evaporateChunk, createElectricCross } from './effects.js';

export default class MazeManager {
  constructor(scene) {
    this.scene = scene;
    this.tileSize = 16;
    this.activeChunks = [];
    this.chunkCount = 0;
    this.chunkSpacing = 16;
    // Use a random base for seeds so mazes differ each run
    this.seedBase = Math.random().toString(36).slice(2);
    this.seedCount = 0;
    this.events = new Phaser.Events.EventEmitter();
  }

  /**
   * Get the world-center position of a chunk info object
   * @param {object} info
   * @returns {{x:number,y:number}}
   */
  getChunkCenter(info) {
    const size = this.tileSize;
    const c = info.chunk.size || info.chunk.width || 0;
    return {
      x: info.offsetX + (c * size) / 2,
      y: info.offsetY + (c * size) / 2
    };
  }

  _nextSeed() {
    return `${this.seedBase}-${this.seedCount++}`;
  }

  spawnInitial() {
    const { size } = pickMazeConfig(1);
    const chunk = createChunk(this._nextSeed(), size, 'W');
    this._ensureEntrance(chunk);
    this._addOxygenConsole(chunk);
    return this.addChunk(chunk, 0, 0);
  }

  addChunk(chunk, offsetX, offsetY) {
    const info = {
      index: this.chunkCount++,
      chunk,
      offsetX,
      offsetY,
      doorSprite: null,
      entranceDoorSprite: null,
      chestSprite: null,
      airTankSprite: null,
      oxygenSprite: null,
      oxygenPosition: null,
      silverDoors: [],
      autoGates: [],
      spikeSprites: [],
      electricMachines: [],
      sprites: []
    };
    this.renderChunk(chunk, info);
    // Fade sprites in similar to the old container
    info.sprites.forEach(s => (s.alpha = 0));
    this.scene.tweens.add({ targets: info.sprites, alpha: 1, duration: 400 });
    this.activeChunks.push(info);
    this.events.emit('chunk-added', info);
    this.events.emit('chunk-created', info);
    return info;
  }

  renderChunk(chunk, info) {
    const size = this.tileSize;
    for (let y = 0; y < chunk.size; y++) {
      for (let x = 0; x < chunk.size; x++) {
        const tile = chunk.tiles[y * chunk.size + x];
        const floor = Characters.createFloor(this.scene);
        floor.setDisplaySize(size, size);
        floor.setPosition(info.offsetX + x * size, info.offsetY + y * size);
        // Floors should always render behind other objects
        floor.setDepth(-1);
        this.scene.worldLayer.add(floor);
        info.sprites.push(floor);

        let sprite = null;
        switch (tile) {
          case TILE.WALL:
            if (
              chunk.electricMachines &&
              chunk.electricMachines.find(v => v.x === x && v.y === y)
            ) {
              sprite = Characters.createElectricMachine(this.scene);
            } else {
              sprite = Characters.createWall(this.scene);
            }
            break;
          case TILE.SPECIAL:
            sprite = Characters.createOxygenConsole(this.scene);
            info.oxygenSprite = sprite;
            info.oxygenPosition = { x, y };
            break;
          case TILE.DOOR:
            sprite = Characters.createExit(this.scene);
            info.doorSprite = sprite;
            info.doorPosition = { x, y };
            break;
          case TILE.SILVER_DOOR:
            sprite = Characters.createSilverDoor(this.scene);
            if (chunk.silverDoors) {
              const d = chunk.silverDoors.find(v => v.x === x && v.y === y);
              if (d) {
                d.sprite = sprite;
                info.silverDoors.push(d);
              }
            }
            break;
          case TILE.AUTO_GATE:
            sprite = Characters.createAutoGateOpen(this.scene);
            if (chunk.autoGates) {
              const g = chunk.autoGates.find(v => v.x === x && v.y === y);
              if (g) {
                g.sprite = sprite;
                info.autoGates.push(g);
              }
            }
            break;
          case TILE.CHEST:
          case TILE.ITEM_CHEST:
            // Display a key icon instead of a treasure chest
            sprite = Characters.createKey(this.scene);
            info.chestSprite = sprite;
            info.chestPosition = { x, y };
            break;
          case TILE.OXYGEN:
            sprite = Characters.createAirTank(this.scene);
            info.airTankSprite = sprite;
            info.airTankPosition = { x, y };
            break;
        }

        if (sprite) {
          sprite.setDisplaySize(size, size);
          sprite.setPosition(info.offsetX + x * size, info.offsetY + y * size);
          this.scene.worldLayer.add(sprite);
          info.sprites.push(sprite);
          if (
            chunk.electricMachines &&
            chunk.electricMachines.find(v => v.x === x && v.y === y)
          ) {
            const m = chunk.electricMachines.find(v => v.x === x && v.y === y);
            const cx = info.offsetX + x * size + size / 2;
            const cy = info.offsetY + y * size + size / 2;
            const effects = [];
            const dirs = [
              { dx: 1, dy: 0 },
              { dx: -1, dy: 0 },
              { dx: 0, dy: 1 },
              { dx: 0, dy: -1 }
            ];
            for (const d of dirs) {
              const nx = x + d.dx;
              const ny = y + d.dy;
              if (
                nx < 0 ||
                ny < 0 ||
                nx >= chunk.size ||
                ny >= chunk.size ||
                chunk.tiles[ny * chunk.size + nx] === TILE.WALL
              ) {
                continue;
              }
              const ex = info.offsetX + nx * size + size / 2;
              const ey = info.offsetY + ny * size + size / 2;
              const e = createElectricCross(this.scene, ex, ey, size);
              e.setVisible(false);
              this.scene.worldLayer.add(e);
              info.sprites.push(e);
              effects.push(e);
            }
            const center = createElectricCross(this.scene, cx, cy, size * 0.6);
            center.setVisible(false);
            this.scene.worldLayer.add(center);
            info.sprites.push(center);

            info.electricMachines.push({
              x,
              y,
              sprite,
              effects,
              centerEffect: center,
              timer: Math.random() * 4000,
              sparkTimer: Math.random() * 1000,
              sparkDuration: 0,
              active: false
            });
            Object.assign(m, {
              sprite,
              effects,
              centerEffect: center,
              timer: Math.random() * 4000,
              sparkTimer: Math.random() * 1000,
              sparkDuration: 0,
              active: false
            });
          }
        }

        if (chunk.spikes) {
          const s = chunk.spikes.find(v => v.x === x && v.y === y);
          if (s) {
            const spikeSprite = Characters.createSpike(this.scene);
            spikeSprite.setDisplaySize(size, size);
            spikeSprite.setPosition(info.offsetX + x * size, info.offsetY + y * size);
            this.scene.worldLayer.add(spikeSprite);
            info.sprites.push(spikeSprite);
            info.spikeSprites.push({ x, y, sprite: spikeSprite });
          }
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
    const heroTile = this.worldToTile(hero.x, hero.y);
    const heroIdx = heroTile ? heroTile.chunk.index : -1;
    for (const obj of [...this.activeChunks]) {
      if (obj.autoGates && obj.autoGates.length) {
        const hx = heroTile && heroTile.chunk === obj ? heroTile.tx : -1;
        const hy = heroTile && heroTile.chunk === obj ? heroTile.ty : -1;
        for (const gate of obj.autoGates) {
          if (gate.closed) continue;
          if (!gate.passed && gate.x === hx && gate.y === hy) {
            gate.passed = true;
          } else if (gate.passed && (gate.x !== hx || gate.y !== hy)) {
            gate.closed = true;
            if (gate.sprite) {
              gate.sprite.setTexture('auto_gate_closed');
            }
            this.scene.sound.play('door_open');
          }
        }
      }
      if (obj.electricMachines && obj.electricMachines.length) {
        for (const m of obj.electricMachines) {
          m.timer += delta;
          if (m.timer >= 4000) m.timer -= 4000;
          const active = m.timer >= 3000;
          if (active !== m.active) {
            m.active = active;
            if (m.effects) m.effects.forEach(e => e.setVisible(active));
            if (m.centerEffect) m.centerEffect.setVisible(false);
          }

          if (!active) {
            m.sparkTimer += delta;
            if (m.sparkTimer >= 1000) {
              m.sparkTimer -= 1000;
              if (m.centerEffect) {
                m.centerEffect.setVisible(true);
                m.sparkDuration = 200;
              }
            }
          }

          if (m.centerEffect && m.centerEffect.visible) {
            m.sparkDuration -= delta;
            if (m.sparkDuration <= 0) {
              m.centerEffect.setVisible(false);
            }
          }
        }
      }
      if (heroIdx >= obj.index + 2) {
        if (this.isHeroInside(hero, obj)) {
          this.scene.handleGameOver();
        }
        const size = obj.chunk.size * this.tileSize;
        evaporateChunk(this.scene, obj.offsetX, obj.offsetY, size, size);
        obj.sprites.forEach(s => s.destroy());
        this.activeChunks = this.activeChunks.filter(c => c !== obj);
        continue;
      }
      if (obj.index !== 0 && obj.age > this.fadeDelay && !obj.fading) {
        obj.fading = true;
        this.scene.tweens.add({
          targets: obj.sprites,
          alpha: 0,
          duration: this.fadeDuration,
          onComplete: () => {
            if (this.isHeroInside(hero, obj)) {
              this.scene.handleGameOver();
            }
            const size = obj.chunk.size * this.tileSize;
            evaporateChunk(this.scene, obj.offsetX, obj.offsetY, size, size);
            obj.sprites.forEach(s => s.destroy());
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
    const chunk = createChunk(this._nextSeed(), size, entryDir);

    let { offsetX, offsetY } = this._calcOffset(fromObj, chunk.size, doorDir);

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
      if (progress >= 19) {
        const total = Math.floor(Math.random() * 3) + 1; // 1-3 doors
        this._addMixedDoors(chunk, total);
      } else if (progress >= 10) {
        if (progress === 10) {
          // Ensure an auto gate always appears on the 11th chunk
          this._addAutoGate(chunk);
        } else if (Math.random() < 0.5) {
          this._addSilverDoor(chunk);
        } else {
          this._addAutoGate(chunk);
        }
      } else {
        this._addSilverDoor(chunk);
      }
      this._addAirTank(chunk);
    }
    if (progress >= 2) {
      this._addSpikes(chunk);
    }
    if (progress >= 2) {
      this._addElectricMachine(chunk);
    }

    const info = this.addChunk(chunk, offsetX, offsetY);
    info.entranceDoorSprite = fromObj.doorSprite;
    if (fromObj.doorSprite) {
      fromObj.sprites = fromObj.sprites.filter(s => s !== fromObj.doorSprite);
      info.sprites.push(fromObj.doorSprite);
      fromObj.doorSprite = null;
    }

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

  _isNearEntranceOrExit(chunk, x, y) {
    if (chunk.entrance) {
      const dx = Math.abs(chunk.entrance.x - x);
      const dy = Math.abs(chunk.entrance.y - y);
      if (dx <= 1 && dy <= 1) return true;
    }
    if (chunk.door) {
      const dx = Math.abs(chunk.door.x - x);
      const dy = Math.abs(chunk.door.y - y);
      if (dx <= 1 && dy <= 1) return true;
    }
    return false;
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

    if (chunk.chest) {
      const idx = chunk.chest.y * size + chunk.chest.x;
      if (this._isNearEntranceOrExit(chunk, chunk.chest.x, chunk.chest.y)) {
        let nx, ny;
        do {
          nx = Math.floor(Math.random() * (size - 2)) + 1;
          ny = Math.floor(Math.random() * (size - 2)) + 1;
        } while (
          chunk.tiles[ny * size + nx] !== TILE.FLOOR ||
          this._isNearEntranceOrExit(chunk, nx, ny)
        );
        chunk.tiles[idx] = TILE.FLOOR;
        chunk.tiles[ny * size + nx] = TILE.CHEST;
        chunk.chest.x = nx;
        chunk.chest.y = ny;
      }
    }
  }

  _getDoorCandidates(chunk) {
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
    return candidates;
  }

  _addSilverDoor(chunk, count) {
    const size = chunk.size;
    const candidates = this._getDoorCandidates(chunk);
    const doors = [];
    if (candidates.length) {
      const doorCount =
        typeof count === 'number'
          ? Math.min(count, candidates.length)
          : size >= 11 && Math.random() < 0.5
            ? 2
            : 1;
      for (let i = 0; i < doorCount && candidates.length; i++) {
        const idx = Math.floor(Math.random() * candidates.length);
        const spot = candidates.splice(idx, 1)[0];
        chunk.tiles[spot.y * size + spot.x] = TILE.SILVER_DOOR;
        doors.push({ x: spot.x, y: spot.y, opened: false });
      }
    }
    chunk.silverDoors = doors;
  }

  _addAutoGate(chunk, count) {
    const size = chunk.size;
    const candidates = this._getDoorCandidates(chunk);
    const gates = [];
    if (candidates.length) {
      const gateCount =
        typeof count === 'number'
          ? Math.min(count, candidates.length)
          : size >= 11 && Math.random() < 0.5
            ? 2
            : 1;
      for (let i = 0; i < gateCount && candidates.length; i++) {
        const idx = Math.floor(Math.random() * candidates.length);
        const spot = candidates.splice(idx, 1)[0];
        chunk.tiles[spot.y * size + spot.x] = TILE.AUTO_GATE;
        gates.push({ x: spot.x, y: spot.y, closed: false, passed: false });
      }
    }
    chunk.autoGates = gates;
  }

  _addMixedDoors(chunk, totalCount) {
    const size = chunk.size;
    const candidates = this._getDoorCandidates(chunk);
    const doors = [];
    const gates = [];
    const count = Math.min(totalCount, candidates.length);
    for (let i = 0; i < count; i++) {
      const idx = Math.floor(Math.random() * candidates.length);
      const spot = candidates.splice(idx, 1)[0];
      if (Math.random() < 0.5) {
        chunk.tiles[spot.y * size + spot.x] = TILE.SILVER_DOOR;
        doors.push({ x: spot.x, y: spot.y, opened: false });
      } else {
        chunk.tiles[spot.y * size + spot.x] = TILE.AUTO_GATE;
        gates.push({ x: spot.x, y: spot.y, closed: false, passed: false });
      }
    }
    chunk.silverDoors = doors;
    chunk.autoGates = gates;
  }

  _addAirTank(chunk) {
    const size = chunk.size;
    const t = chunk.tiles;
    let x, y;
    do {
      x = Math.floor(Math.random() * (size - 2)) + 1;
      y = Math.floor(Math.random() * (size - 2)) + 1;
    } while (
      t[y * size + x] !== TILE.FLOOR ||
      this._isNearEntranceOrExit(chunk, x, y)
    );
    t[y * size + x] = TILE.OXYGEN;
    chunk.airTank = { x, y, collected: false };
  }

  _addElectricMachine(chunk) {
    if (Math.random() >= 0.3) return;
    const size = chunk.size;
    const t = chunk.tiles;
    const candidates = [];
    for (let y = 1; y < size - 1; y++) {
      for (let x = 1; x < size - 1; x++) {
        if (t[y * size + x] !== TILE.WALL) continue;
        if (this._isNearEntranceOrExit(chunk, x, y)) continue;
        candidates.push({ x, y });
      }
    }
    if (candidates.length) {
      const spot = candidates[Math.floor(Math.random() * candidates.length)];
      if (!chunk.electricMachines) chunk.electricMachines = [];
      chunk.electricMachines.push({
        x: spot.x,
        y: spot.y,
        timer: 0,
        sparkTimer: 0,
        sparkDuration: 0,
        active: false
      });
    }
  }

  _addOxygenConsole(chunk) {
    const size = chunk.size;
    const t = chunk.tiles;
    const candidates = [];
    for (let y = 1; y < size - 1; y++) {
      for (let x = 1; x < size - 1; x++) {
        if (t[y * size + x] !== TILE.WALL) continue;
        if (this._isNearEntranceOrExit(chunk, x, y)) continue;
        candidates.push({ x, y });
      }
    }
    if (candidates.length) {
      const spot = candidates[Math.floor(Math.random() * candidates.length)];
      t[spot.y * size + spot.x] = TILE.SPECIAL;
      chunk.oxygenConsole = { x: spot.x, y: spot.y };
    }
  }

  _addSpikes(chunk) {
    const size = chunk.size;
    const t = chunk.tiles;
    const spikeCount = Math.floor(Math.random() * 3); // 0-2
    const spikes = [];
    for (let i = 0; i < spikeCount; i++) {
      let x, y;
      let tries = 0;
      do {
        x = Math.floor(Math.random() * (size - 2)) + 1;
        y = Math.floor(Math.random() * (size - 2)) + 1;
        tries++;
      } while (
        (t[y * size + x] !== TILE.FLOOR ||
          this._isNearEntranceOrExit(chunk, x, y) ||
          spikes.some(s => s.x === x && s.y === y)) &&
        tries < 20
      );
      if (tries < 20) {
        spikes.push({ x, y });
      }
    }
    chunk.spikes = spikes;
  }

  openDoor(info) {
    if (info && info.doorSprite) {
      info.doorSprite.setTexture('door_open');
    }
    if (info && info.entranceDoorSprite) {
      info.entranceDoorSprite.setTexture('exit');
    }
  }

  openSilverDoor(info, x, y) {
    if (info && info.silverDoors) {
      const door = info.silverDoors.find(d => d.x === x && d.y === y);
      if (door && !door.opened) {
        if (door.sprite) {
          door.sprite.setTexture('door_silver_open');
        }
        door.opened = true;
      }
    }
  }

  removeChest(info) {
    if (info && info.chestSprite) {
      this.scene.tweens.add({
        targets: info.chestSprite,
        alpha: 0,
        y: '-=8',
        duration: 200,
        onComplete: () => {
          info.chestSprite.destroy();
          info.chestSprite = null;
        }
      });
    }
  }

  removeAirTank(info) {
    if (info && info.airTankSprite) {
      const sprite = info.airTankSprite;
      info.airTankSprite = null;
      this.scene.tweens.add({
        targets: sprite,
        alpha: 0,
        y: '-=8',
        duration: 200,
        onComplete: () => {
          sprite.destroy();
          if (info.chunk.airTank) {
            const { x, y } = info.chunk.airTank;
            const idx = y * info.chunk.size + x;
            info.chunk.tiles[idx] = TILE.FLOOR;
            info.chunk.airTank.collected = true;
          }
        }
      });
    }
  }
}
