import { createChunk, TILE } from './maze_generator_core.js';
import Characters from './characters.js';
import { pickMazeConfig } from './maze_table.js';
import { evaporateChunk, addReactorPulse } from './effects.js';

const DECAL_KEYS = [
  'floor_crack1',
  'floor_crack2',
  'floor_dirt1',
  'floor_dirt2',
  'floor_scratch1',
  'floor_scratch2'
];
const DECAL_CHANCE = 0.15;

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
    const { size } = pickMazeConfig(1, 0);
    const chunk = createChunk(this._nextSeed(), size, 'W');
    this._ensureEntrance(chunk);
    this._addOxygenConsole(chunk);
    this._addBrokenSleepPod(chunk);
    chunk.electricMachines = [];
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
      airTankSprites: [],
      oxygenSprite: null,
      oxygenPosition: null,
      itemSwitchSprite: null,
      itemSwitchPosition: null,
      silverDoors: [],
      autoGates: [],
      spikeSprites: [],
      electricMachineSprites: [],
      sprites: []
    };
    this.renderChunk(chunk, info);
    if (info.index === 0) {
      this._addHeroPosters(info);
    }
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
    const decalMap = Array.from({ length: chunk.size }, () =>
      Array(chunk.size).fill(false)
    );
    for (let y = 0; y < chunk.size; y++) {
      for (let x = 0; x < chunk.size; x++) {
        const tile = chunk.tiles[y * chunk.size + x];
        const isCorner =
          (x === 0 && y === 0) ||
          (x === chunk.size - 1 && y === 0) ||
          (x === 0 && y === chunk.size - 1) ||
          (x === chunk.size - 1 && y === chunk.size - 1);
        if (!isCorner) {
          const floor = Characters.createFloor(this.scene);
          floor.setDisplaySize(size, size);
          floor.setPosition(info.offsetX + x * size, info.offsetY + y * size);
          // Floors should always render behind other objects
          floor.setDepth(-1);
          this.scene.worldLayer.add(floor);
          info.sprites.push(floor);

          if (tile === TILE.FLOOR) {
            this._maybeAddFloorDecal(info, decalMap, x, y);
          }
        }

        let sprite = null;
        switch (tile) {
          case TILE.WALL: {
            const machine =
              chunk.electricMachines &&
              chunk.electricMachines.find(m => m.x === x && m.y === y);
            if (machine) {
              sprite = Characters.createElectricMachine(this.scene);
              machine.sprite = sprite;
              info.electricMachineSprites.push(machine);
              break;
            }
            if (
              chunk.heroSleepPods &&
              chunk.heroSleepPods.find(p => p.x === x && p.y === y)
            ) {
              sprite = Characters.createSleepPodWithHero(this.scene);
              break;
            }
            // Display a broken sleep pod instead of a wall if this position
            // is marked as such. This must be done before creating any wall
            // sprites to avoid leaving unused wall graphics in the scene.
            if (
              chunk.brokenPod &&
              chunk.brokenPod.x === x &&
              chunk.brokenPod.y === y
            ) {
              sprite = Characters.createSleepPodBroken(this.scene);
              break;
            }
            // Count surrounding wall-like tiles (including doors) in all 8 directions.
            // Walls that have been replaced by other objects (e.g. machines) should not
            // be considered when determining the current wall's sprite.
            const hasReplacement = (cx, cy) => {
              if (chunk.brokenPod && chunk.brokenPod.x === cx && chunk.brokenPod.y === cy) return true;
              if (chunk.heroSleepPods && chunk.heroSleepPods.some(p => p.x === cx && p.y === cy)) return true;
              if (chunk.electricMachines && chunk.electricMachines.some(m => m.x === cx && m.y === cy)) return true;
              return false;
            };
            const isWallLike = (cx, cy) => {
              if (hasReplacement(cx, cy)) return false;
              const t = chunk.tiles[cy * chunk.size + cx];
              return (
                t === TILE.WALL ||
                t === TILE.DOOR ||
                t === TILE.SILVER_DOOR ||
                t === TILE.AUTO_GATE
              );
            };
            const check = (cx, cy) =>
              cx >= 0 &&
              cy >= 0 &&
              cx < chunk.size &&
              cy < chunk.size &&
              isWallLike(cx, cy);

            const west = check(x - 1, y);
            const east = check(x + 1, y);
            const north = check(x, y - 1);
            const south = check(x, y + 1);
            const nw = check(x - 1, y - 1);
            const ne = check(x + 1, y - 1);
            const sw = check(x - 1, y + 1);
            const se = check(x + 1, y + 1);

            const neighborCount =
              (west ? 1 : 0) +
              (east ? 1 : 0) +
              (north ? 1 : 0) +
              (south ? 1 : 0) +
              (nw ? 1 : 0) +
              (ne ? 1 : 0) +
              (sw ? 1 : 0) +
              (se ? 1 : 0);

            if (neighborCount === 1) {
              sprite = Characters.createWallEnd(this.scene);
              if (south) {
                sprite.setAngle(0);
              } else if (west) {
                sprite.setAngle(90);
              } else if (north) {
                sprite.setAngle(180);
              } else if (east) {
                sprite.setAngle(270);
              }
            } else if (neighborCount === 2) {
              const isCornerShape =
                (east && south) || (south && west) || (west && north) || (north && east);
              if (isCornerShape) {
                sprite = Characters.createWallCorner(this.scene);
                if (east && south) {
                  sprite.setAngle(0);
                } else if (south && west) {
                  sprite.setAngle(90);
                } else if (west && north) {
                  sprite.setAngle(180);
                } else if (north && east) {
                  sprite.setAngle(270);
                }
              } else {
                sprite = Characters.createWall(this.scene);
              }
            } else {
              sprite = Characters.createWall(this.scene);
            }
            break;
          }
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
            if (chunk.autoGates) {
              const g = chunk.autoGates.find(v => v.x === x && v.y === y);
              if (g) {
                sprite = g.closed
                  ? Characters.createAutoGateClosed(this.scene)
                  : Characters.createAutoGateOpen(this.scene);
                g.sprite = sprite;
                info.autoGates.push(g);
              } else {
                sprite = Characters.createAutoGateOpen(this.scene);
              }
            } else {
              sprite = Characters.createAutoGateOpen(this.scene);
            }
            break;
          case TILE.CHEST:
          case TILE.ITEM_CHEST:
            // Display a key icon instead of a treasure chest
            sprite = Characters.createKey(this.scene);
            info.chestSprite = sprite;
            info.chestPosition = { x, y };
            break;
          case TILE.OXYGEN: {
            const at =
              info.chunk.airTanks &&
              info.chunk.airTanks.find(t => t.x === x && t.y === y && !t.collected);
            const isAdvanced = at && at.advanced;
            sprite = isAdvanced
              ? Characters.createAirTankDark(this.scene)
              : Characters.createAirTank(this.scene);
            info.airTankSprites.push({ x, y, sprite });
            break;
          }
          case TILE.REACTOR:
            if (
              chunk.reactorCore &&
              x === chunk.reactorCore.x &&
              y === chunk.reactorCore.y
            ) {
              sprite = Characters.createReactorCore(this.scene);
              sprite._noAutoSize = true;
              sprite.setDisplaySize(size * 3, size * 3);
              info.reactorSprite = sprite;
            }
            break;
        }

        if (sprite) {
          if (!sprite._noAutoSize) {
            sprite.setDisplaySize(size, size);
          }
          const posX = info.offsetX + x * size;
          const posY = info.offsetY + y * size;
          // Center-origin sprites (like wall corners) should be positioned
          // on the tile center so rotation works as expected
          if (sprite.originX === 0.5 && sprite.originY === 0.5) {
            sprite.setPosition(posX + size / 2, posY + size / 2);
          } else {
            sprite.setPosition(posX, posY);
          }
          this.scene.worldLayer.add(sprite);
          info.sprites.push(sprite);
          if (sprite === info.reactorSprite) {
            const pulse = addReactorPulse(this.scene, sprite, size * 1.5);
            info.sprites.push(pulse);
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

        if (
          chunk.itemSwitch &&
          !chunk.itemSwitch.triggered &&
          chunk.itemSwitch.x === x &&
          chunk.itemSwitch.y === y
        ) {
          const sw = Characters.createItemSwitch(this.scene);
          sw.setDisplaySize(size, size);
          sw.setPosition(info.offsetX + x * size, info.offsetY + y * size);
          this.scene.worldLayer.add(sw);
          info.sprites.push(sw);
          info.itemSwitchSprite = sw;
          info.itemSwitchPosition = { x, y };
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

      if (obj.chunk.electricMachines && obj.chunk.electricMachines.length) {
        for (const machine of obj.chunk.electricMachines) {
          machine.timer += delta;
          const cycle = machine.timer % 4000;
          const active = cycle >= 3000;
          const leak = !active && cycle % 1000 < 200;
          machine.active = active;
          const cx = obj.offsetX + machine.x * this.tileSize + this.tileSize / 2;
          const cy = obj.offsetY + machine.y * this.tileSize + this.tileSize / 2;

          if (active) {
            if (machine.timer - (machine.lastEffect || -Infinity) > 120) {
              machine.lastEffect = machine.timer;
              const dirs = [
                { dx: 1, dy: 0 },
                { dx: -1, dy: 0 },
                { dx: 0, dy: 1 },
                { dx: 0, dy: -1 }
              ];
              for (const { dx, dy } of dirs) {
                const tx = machine.x + dx;
                const ty = machine.y + dy;
                if (
                  tx >= 0 &&
                  ty >= 0 &&
                  tx < obj.chunk.size &&
                  ty < obj.chunk.size &&
                  obj.chunk.tiles[ty * obj.chunk.size + tx] === TILE.FLOOR
                ) {
                  const ex =
                    obj.offsetX + tx * this.tileSize + this.tileSize / 2;
                  const ey =
                    obj.offsetY + ty * this.tileSize + this.tileSize / 2;
                  this._createLightning(cx, cy, ex, ey, 2);
                }
              }

              const angle = Math.random() * Math.PI * 2;
              const dist = (this.tileSize / 2) * Math.random();
              const ex = cx + Math.cos(angle) * dist;
              const ey = cy + Math.sin(angle) * dist;
              this._createLightning(cx, cy, ex, ey, 2);
            }
          }

          if (leak) {
            if (machine.timer - (machine.lastLeak || -Infinity) > 100) {
              machine.lastLeak = machine.timer;
              const angle = Math.random() * Math.PI * 2;
              const dist = (this.tileSize / 2) * Math.random();
              const ex = cx + Math.cos(angle) * dist;
              const ey = cy + Math.sin(angle) * dist;
              this._createLightning(cx, cy, ex, ey, 1);
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

    const isRestPoint = progress === 14 || progress === 29;
    const isBossRoom = progress === 32;

    let chunk;
    if (isBossRoom) {
      chunk = this._createBossChunk(entryDir);
    } else if (isRestPoint) {
      chunk = createChunk(this._nextSeed(), 7, entryDir);
      this._ensureEntrance(chunk);
      this._addOxygenConsole(chunk);
      if (progress === 29) {
        this._addBrokenSleepPod(chunk);
      } else {
        this._addSleepPodsWithHero(chunk, 5);
      }
      chunk.electricMachines = [];
      chunk.restPoint = true;
    } else {
      const { size } = pickMazeConfig(progress + 1, progress);
      chunk = createChunk(this._nextSeed(), size, entryDir);
    }

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
    if (!isRestPoint && !isBossRoom && progress >= 1) {
      if (progress === 30 || progress === 31) {
        // Only closed auto gates on the 31st and 32nd chunks
        this._addAutoGate(chunk, 3, true);
      } else if (progress >= 19) {
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
      const advanced = progress >= 4 && Math.random() < 0.1;
      this._addAirTank(chunk, advanced);
    }
    if (!isRestPoint && !isBossRoom && progress >= 2) {
      this._addSpikes(chunk);
      this._addElectricMachine(chunk, progress);
    }
    if (!isRestPoint && !isBossRoom && progress >= 20) {
      if (progress === 20 || Math.random() < 0.3) {
        this._addItemSwitch(chunk);
      }
    }

    if (!isRestPoint && !isBossRoom) {
      if (progress === 25) {
        this._addSleepPodsWithHero(chunk, 1);
      } else if (progress === 26) {
        this._addSleepPodsWithHero(chunk, 3);
      } else if (progress === 27) {
        this._addSleepPodsWithHero(chunk, 5);
      } else if (progress === 28) {
        this._addSleepPodsWithHero(chunk, 10);
      }
    }

    const info = this.addChunk(chunk, offsetX, offsetY);
    if (chunk.restPoint) {
      info.restPoint = true;
    }
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

  _addAutoGate(chunk, count, closed = false) {
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
        gates.push({ x: spot.x, y: spot.y, closed, passed: false });
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

  _addAirTank(chunk, advanced = false) {
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
    if (!chunk.airTanks) chunk.airTanks = [];
    chunk.airTanks.push({ x, y, collected: false, advanced });
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

  _addBrokenSleepPod(chunk) {
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
      chunk.brokenPod = { x: spot.x, y: spot.y };
    }
  }

  _addSleepPodsWithHero(chunk, count = 1) {
    const size = chunk.size;
    const t = chunk.tiles;
    const candidates = [];
    for (let y = 1; y < size - 1; y++) {
      for (let x = 1; x < size - 1; x++) {
        if (t[y * size + x] !== TILE.WALL) continue;
        if (this._isNearEntranceOrExit(chunk, x, y)) continue;
        if (chunk.oxygenConsole && chunk.oxygenConsole.x === x && chunk.oxygenConsole.y === y)
          continue;
        if (chunk.brokenPod && chunk.brokenPod.x === x && chunk.brokenPod.y === y)
          continue;
        candidates.push({ x, y });
      }
    }
    chunk.heroSleepPods = [];
    for (let i = 0; i < count && candidates.length; i++) {
      const idx = Math.floor(Math.random() * candidates.length);
      const spot = candidates.splice(idx, 1)[0];
      chunk.heroSleepPods.push({ x: spot.x, y: spot.y });
    }
  }

  _addItemSwitch(chunk) {
    const size = chunk.size;
    const t = chunk.tiles;
    let x, y, tries = 0;
    do {
      x = Math.floor(Math.random() * (size - 2)) + 1;
      y = Math.floor(Math.random() * (size - 2)) + 1;
      tries++;
    } while (
      (t[y * size + x] !== TILE.FLOOR ||
        this._isNearEntranceOrExit(chunk, x, y) ||
        (chunk.airTanks && chunk.airTanks.some(t => t.x === x && t.y === y && !t.collected)) ||
        (chunk.spikes && chunk.spikes.some(s => s.x === x && s.y === y)) ||
        (chunk.electricMachines &&
          chunk.electricMachines.some(m => m.x === x && m.y === y)) ||
        (chunk.oxygenConsole &&
          chunk.oxygenConsole.x === x &&
          chunk.oxygenConsole.y === y) ||
        (chunk.brokenPod && chunk.brokenPod.x === x && chunk.brokenPod.y === y) ||
        (chunk.heroSleepPods &&
          chunk.heroSleepPods.some(p => p.x === x && p.y === y))) &&
      tries < 50
    );
    if (tries >= 50) return;
    chunk.itemSwitch = { x, y, triggered: false };
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

  _addElectricMachine(chunk, progress = 0) {
    const size = chunk.size;
    const t = chunk.tiles;
    const candidates = [];
    for (let y = 1; y < size - 1; y++) {
      for (let x = 1; x < size - 1; x++) {
        if (t[y * size + x] !== TILE.WALL) continue;
        if (this._isNearEntranceOrExit(chunk, x, y)) continue;
        if (chunk.oxygenConsole && chunk.oxygenConsole.x === x && chunk.oxygenConsole.y === y) continue;
        if (chunk.brokenPod && chunk.brokenPod.x === x && chunk.brokenPod.y === y) continue;
        if (
          chunk.heroSleepPods &&
          chunk.heroSleepPods.some(p => p.x === x && p.y === y)
        )
          continue;
        candidates.push({ x, y });
      }
    }
    chunk.electricMachines = [];
    let chance = 0;
    if (progress >= 15) {
      chance = progress === 15 ? 1 : 0.6;
    }
    const addMachine = () => {
      const idx = Math.floor(Math.random() * candidates.length);
      const spot = candidates.splice(idx, 1)[0];
      chunk.electricMachines.push({
        x: spot.x,
        y: spot.y,
        timer: 0,
        active: false,
        lastEffect: -Infinity,
        lastLeak: -Infinity
      });
    };

    if (candidates.length && Math.random() < chance) {
      addMachine();
    }

    if (progress >= 20 && chunk.electricMachines.length && candidates.length) {
      if (Math.random() < 0.8 && candidates.length) {
        addMachine();
      }
      if (Math.random() < 0.1 && candidates.length) {
        addMachine();
      }
    }
  }

  _addHeroPosters(info) {
    const chunk = info.chunk;
    const size = chunk.size;
    const t = chunk.tiles;
    const candidates = [];
    for (let y = 1; y < size - 1; y++) {
      for (let x = 1; x < size - 1; x++) {
        if (t[y * size + x] !== TILE.WALL) continue;
        if (this._isNearEntranceOrExit(chunk, x, y)) continue;
        if (chunk.oxygenConsole && chunk.oxygenConsole.x === x && chunk.oxygenConsole.y === y) continue;
        if (chunk.brokenPod && chunk.brokenPod.x === x && chunk.brokenPod.y === y) continue;
        if (chunk.heroSleepPods && chunk.heroSleepPods.some(p => p.x === x && p.y === y)) continue;
        if (chunk.electricMachines && chunk.electricMachines.some(m => m.x === x && m.y === y)) continue;
        candidates.push({ x, y });
      }
    }

    info.heroPosterSprites = [];
    const count = Math.min(2, candidates.length);
    for (let i = 0; i < count; i++) {
      const idx = Math.floor(Math.random() * candidates.length);
      const spot = candidates.splice(idx, 1)[0];
      const sprite = Characters.createHeroSpacesuit(this.scene);
      const ratio = sprite.height / sprite.width;
      sprite.setDisplaySize(this.tileSize, this.tileSize * ratio);
      const posX = info.offsetX + spot.x * this.tileSize;
      const posY = info.offsetY + spot.y * this.tileSize + this.tileSize - sprite.displayHeight;
      sprite.setPosition(posX, posY);
      sprite.setDepth(1);
      sprite.alpha = 0;
      this.scene.worldLayer.add(sprite);
      info.sprites.push(sprite);
      info.heroPosterSprites.push({ x: spot.x, y: spot.y, sprite });
    }
  }

  _addReactorCore(chunk) {
    const c = Math.floor(chunk.size / 2);
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const x = c + dx;
        const y = c + dy;
        chunk.tiles[y * chunk.size + x] = TILE.REACTOR;
      }
    }
    chunk.reactorCore = { x: c, y: c };
  }

  _createBossChunk(entryDir) {
    const size = 13;
    const chunk = {
      size,
      seed: this._nextSeed(),
      entry: entryDir,
      tiles: new Uint8Array(size * size),
      door: null,
      chest: null
    };
    // fill with floor and walls around edges
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const idx = y * size + x;
        chunk.tiles[idx] =
          x === 0 || y === 0 || x === size - 1 || y === size - 1
            ? TILE.WALL
            : TILE.FLOOR;
      }
    }
    this._addReactorCore(chunk);
    return chunk;
  }

  _createLightning(x1, y1, x2, y2, width = 2, depth = 1) {
    const gfx = this.scene.add.graphics();
    gfx.lineStyle(width, 0xffff66, 1);
    gfx.setBlendMode(Phaser.BlendModes.ADD);
    gfx.setDepth(depth);
    gfx.beginPath();
    const segs = 3;
    gfx.moveTo(x1, y1);
    const dx = x2 - x1;
    const dy = y2 - y1;
    for (let i = 1; i < segs; i++) {
      const t = i / segs;
      const nx = x1 + dx * t;
      const ny = y1 + dy * t;
      const off = (Math.random() - 0.5) * 6;
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      const offX = (-dy / len) * off;
      const offY = (dx / len) * off;
      gfx.lineTo(nx + offX, ny + offY);
    }
    gfx.lineTo(x2, y2);
    gfx.strokePath();
    this.scene.worldLayer.add(gfx);
    this.scene.tweens.add({
      targets: gfx,
      alpha: 0,
      duration: 200,
      onComplete: () => gfx.destroy()
    });
    return gfx;
  }

  _maybeAddFloorDecal(info, decalMap, x, y) {
    if (Math.random() >= DECAL_CHANCE) return;
    if (decalMap[y][x]) return;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        const nx = x + dx;
        const ny = y + dy;
        if (ny >= 0 && ny < decalMap.length && nx >= 0 && nx < decalMap.length) {
          if (decalMap[ny][nx]) return;
        }
      }
    }

    const key = DECAL_KEYS[Math.floor(Math.random() * DECAL_KEYS.length)];
    const decal = Characters.createFloorDecal(this.scene, key);
    decal.setDisplaySize(this.tileSize, this.tileSize);
    const baseX = info.offsetX + x * this.tileSize;
    const baseY = info.offsetY + y * this.tileSize;

    const OFFSET_RANGE = 16;
    const chunkSizePx = info.chunk.size * this.tileSize;
    let posX = baseX + Phaser.Math.Between(-OFFSET_RANGE, OFFSET_RANGE);
    let posY = baseY + Phaser.Math.Between(-OFFSET_RANGE, OFFSET_RANGE);

    const minX = info.offsetX;
    const maxX = info.offsetX + chunkSizePx - this.tileSize;
    const minY = info.offsetY;
    const maxY = info.offsetY + chunkSizePx - this.tileSize;
    posX = Math.min(Math.max(posX, minX), maxX);
    posY = Math.min(Math.max(posY, minY), maxY);

    decal.setPosition(posX + this.tileSize / 2, posY + this.tileSize / 2);
    decal.setAngle(Math.floor(Math.random() * 360));
    decal.setDepth(-0.5);
    this.scene.worldLayer.add(decal);
    info.sprites.push(decal);
    decalMap[y][x] = true;
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

  openAllSilverDoors(info) {
    if (info && info.silverDoors) {
      for (const door of info.silverDoors) {
        this.openSilverDoor(info, door.x, door.y);
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

  removeAirTank(info, x, y) {
    if (!info || !info.airTankSprites) return;
    const idx = info.airTankSprites.findIndex(t => t.x === x && t.y === y);
    if (idx === -1) return;
    const { sprite } = info.airTankSprites.splice(idx, 1)[0];
    this.scene.tweens.add({
      targets: sprite,
      alpha: 0,
      y: '-=8',
      duration: 200,
      onComplete: () => {
        sprite.destroy();
        if (info.chunk.airTanks) {
          const at = info.chunk.airTanks.find(t => t.x === x && t.y === y && !t.collected);
          if (at) {
            const index = y * info.chunk.size + x;
            info.chunk.tiles[index] = TILE.FLOOR;
            at.collected = true;
          }
        }
      }
    });
  }

  removeItemSwitch(info) {
    if (info && info.itemSwitchSprite) {
      const sprite = info.itemSwitchSprite;
      info.itemSwitchSprite = null;
      this.scene.tweens.add({
        targets: sprite,
        alpha: 0,
        duration: 200,
        onComplete: () => sprite.destroy()
      });
      if (info.chunk.itemSwitch) {
        info.chunk.itemSwitch.triggered = true;
      }
    }
  }

  spawnAirTankDrop(info, advanced = false) {
    const spot = this._findDropSpot(info.chunk);
    if (!spot) return;
    const { x, y } = spot;
    const size = this.tileSize;
    const sprite = advanced
      ? Characters.createAirTankDark(this.scene)
      : Characters.createAirTank(this.scene);
    sprite.setDisplaySize(size, size);
    const startY = this.scene.cameras.main.worldView.y - size;
    sprite.setPosition(info.offsetX + x * size, startY);
    sprite.alpha = 0;
    this.scene.worldLayer.add(sprite);
    this.scene.tweens.add({ targets: sprite, alpha: 1, duration: 200 });
    this.scene.tweens.add({
      targets: sprite,
      y: info.offsetY + y * size,
      duration: 400,
      ease: 'Quad.easeIn',
      onComplete: () => {
        info.airTankSprites.push({ x, y, sprite });
        const idx = y * info.chunk.size + x;
        info.chunk.tiles[idx] = TILE.OXYGEN;
        if (!info.chunk.airTanks) info.chunk.airTanks = [];
        info.chunk.airTanks.push({ x, y, collected: false, advanced });
      }
    });
  }

  _findDropSpot(chunk) {
    const size = chunk.size;
    const t = chunk.tiles;
    let x, y, tries = 0;
    do {
      x = Math.floor(Math.random() * (size - 2)) + 1;
      y = Math.floor(Math.random() * (size - 2)) + 1;
      tries++;
    } while (
      (t[y * size + x] !== TILE.FLOOR ||
        this._isNearEntranceOrExit(chunk, x, y) ||
        (chunk.airTanks && chunk.airTanks.some(t => !t.collected && t.x === x && t.y === y)) ||
        (chunk.itemSwitch && !chunk.itemSwitch.triggered && chunk.itemSwitch.x === x && chunk.itemSwitch.y === y) ||
        (chunk.spikes && chunk.spikes.some(s => s.x === x && s.y === y)) ||
        (chunk.electricMachines && chunk.electricMachines.some(m => m.x === x && m.y === y)) ||
        (chunk.oxygenConsole && chunk.oxygenConsole.x === x && chunk.oxygenConsole.y === y) ||
        (chunk.brokenPod && chunk.brokenPod.x === x && chunk.brokenPod.y === y) ||
        (chunk.heroSleepPods && chunk.heroSleepPods.some(p => p.x === x && p.y === y))) &&
      tries < 50
    );
    if (tries >= 50) return null;
    return { x, y };
  }
}
