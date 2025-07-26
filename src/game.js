import gameState from './game-state.js';
import HeroState from './hero_state.js';
import RivalState from './rival_state.js';
import CameraManager from './camera.js';
import MazeManager from './maze_manager.js';
import { TILE } from './maze_generator_core.js';
import Characters from './characters.js';
import InputBuffer from './input_buffer.js';
import UIScene from './ui_scene.js';
import { newChunkTransition, evaporateArea, spawnAfterimage } from './effects.js';
import LoadingScene from './loading_scene.js';
import StarField from './star_field.js';
import GameOverScene from './game_over_scene.js';
import { computeTetherPoints, isHorizontal, isVertical } from './utils.js';
import Shield from './shield.js';
import MeteorField from './meteor_field.js';
import { DEBUG_CHUNK_COUNTER } from './debug_flags.js';

// Trigger a special flash when reaching these cleared chunk counts
// Include the first chunk to show the new "RUN!" message
const MIDPOINTS = [1, 5, 10, 15, 20, 30, 40, 50];

const VIRTUAL_WIDTH = 480;
const VIRTUAL_HEIGHT = 270;

// Global state for tracking overall game progress

class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
    this.isMoving = false;
    this.midpointPlayed = false;
    this.heroAnimationTimer = null;
    this.heroAnimIndex = 0;
    this.oxygenTimer = null;
    this.rivalTimer = null;
    this.bgm = null;
    this.bossBgm1 = null;
    this.bossBgm2 = null;
    this.isGameOver = false;
    this.lastSpikeTile = null;
    this.lastShockTile = null;
    this.oxygenLine = null;
    this.oxygenConsole = null;
    this.rival = null;
    this.rivalSprite = null;
    this.rivalImage = null;
    this.rivalMoving = false;
    this.rivalAnimTimer = null;
    this.rivalAnimIndex = 0;
    this.rivalTrailTimer = null;
    this.rivalSwitchTimer = null;
    this.stopTile = null;
  }

  preload() {
    Characters.registerTextures(this);
  }

  create() {
    this.hero = new HeroState();
    this.isMoving = false;
    this.isGameOver = false;
    this.lastSpikeTile = null;
    this.lastShockTile = null;

    this.sound.stopAll();
    this.bgm = this.sound.add('bgm', { loop: true });
    this.bossBgm1 = this.sound.add('boss_bgm_1', { loop: true });
    this.bossBgm2 = this.sound.add('boss_bgm_2', { loop: true });

    this.worldLayer = this.add.container(0, 0);
    this.mazeManager = new MazeManager(this);

    this.cameraManager = new CameraManager(this, this.mazeManager);
    this.starField = new StarField(this);
    this.shield = new Shield(this);
    this.meteorField = new MeteorField(this, this.shield, false);
    this._seenFirstChunk = false;
    this.mazeManager.events.on('chunk-created', info => {
      this.cameraManager.expandBounds(info);
      const dur = this._seenFirstChunk ? 400 : 0;
      this.cameraManager.panToChunk(info, dur);
      if (this._seenFirstChunk) {
        this.cameraManager.zoomBump();
      }
      this._seenFirstChunk = true;
      // Spawn the rival once the boss room (which contains a reactor core)
      // is generated. Previously we checked for chunk index 32, but the exact
      // index can vary. Using the presence of a reactor core makes this robust
      // if the chunk order changes.
      if (info.chunk.reactorCore) {
        this.spawnRival(info);
      }
    });

    const firstInfo = this.mazeManager.spawnInitial();
    this.sound.play('chunk_generate_1');

    this.heroImage = Characters.createHero(this);
    const heroRatio = this.heroImage.height / this.heroImage.width;
    this.heroImage.setDisplaySize(
      this.mazeManager.tileSize,
      this.mazeManager.tileSize * heroRatio
    );
    // Shift sprite slightly downward so the hero sits lower in its tile
    this.heroImage.y = 0; // centered vertically

    this.heroSprite = this.add.container(0, 0, [this.heroImage]);
    this.heroSprite.x = firstInfo.offsetX + firstInfo.chunk.entrance.x * this.mazeManager.tileSize + this.mazeManager.tileSize / 2;
    this.heroSprite.y = firstInfo.offsetY + firstInfo.chunk.entrance.y * this.mazeManager.tileSize + this.mazeManager.tileSize / 2;
    this.worldLayer.add(this.heroSprite);

    if (firstInfo.oxygenPosition) {
      const size = this.mazeManager.tileSize;
      const cx = firstInfo.offsetX + firstInfo.oxygenPosition.x * size + size / 2;
      const cy = firstInfo.offsetY + firstInfo.oxygenPosition.y * size + size / 2;
      this.oxygenConsole = { x: cx, y: cy };
      this.oxygenLine = this.add.graphics();
      this.worldLayer.add(this.oxygenLine);
    }


    // Handle transitions for door exit
    this.mazeManager.events.on('spawn-next', data => {
      newChunkTransition(this, data.doorDir, data.doorWorldX, data.doorWorldY);
      this.sound.play('chunk_generate_2');

      if (data.info && data.info.restPoint) {
        if (data.info.oxygenPosition) {
          const size = this.mazeManager.tileSize;
          const cx = data.info.offsetX + data.info.oxygenPosition.x * size + size / 2;
          const cy = data.info.offsetY + data.info.oxygenPosition.y * size + size / 2;
          this.oxygenConsole = { x: cx, y: cy };
          if (!this.oxygenLine) {
            this.oxygenLine = this.add.graphics();
            this.worldLayer.add(this.oxygenLine);
          }
        } else {
          this.oxygenConsole = null;
          if (this.oxygenLine) {
            this.oxygenLine.destroy();
            this.oxygenLine = null;
          }
        }
        if (this.bgm && this.bgm.isPlaying) {
          this.bgm.stop();
        }
        if (this.bossBgm1 && this.bossBgm1.isPlaying) {
          this.bossBgm1.stop();
        }
        if (this.bossBgm2 && this.bossBgm2.isPlaying) {
          this.bossBgm2.stop();
        }
        this.sound.play('pick_up');
        this.hero.oxygen = this.hero.maxOxygen;
        this.events.emit('updateOxygen', 1);
        if (this.oxygenTimer) {
          this.oxygenTimer.remove();
          this.oxygenTimer = null;
        }
      } else if (this.oxygenLine) {
        const hx = this.heroSprite.x;
        const hy = this.heroSprite.y;
        const cx = this.oxygenConsole.x;
        const cy = this.oxygenConsole.y;
        const points = computeTetherPoints(cx, cy, hx, hy, this.mazeManager.tileSize, 5);
        points.forEach((p, i) => {
          if (i === 0) return;
          this.time.delayedCall(i * 40, () => {
            evaporateArea(this, p.x - 4, p.y - 4, 8, 8, 0xffffff);
          });
        });
        this.tweens.add({
          targets: this.oxygenLine,
          alpha: 0,
          duration: 200,
          onComplete: () => {
            this.oxygenLine.destroy();
            this.oxygenLine = null;
          }
        });
      }

      if (!data.info || !data.info.restPoint) {
        if (data.info && data.info.isBossRoom) {
          if (this.bgm && this.bgm.isPlaying) {
            this.bgm.stop();
          }
          if (this.bossBgm1) {
            this.bossBgm1.stop();
            this.bossBgm1.play();
          }
          if (this.bossBgm2) {
            this.bossBgm2.stop();
            this.bossBgm2.play();
          }
        } else {
          if (this.bossBgm1 && this.bossBgm1.isPlaying) {
            this.bossBgm1.stop();
          }
          if (this.bossBgm2 && this.bossBgm2.isPlaying) {
            this.bossBgm2.stop();
          }
          if (this.bgm) {
            this.bgm.stop();
            this.bgm.play();
          }
        }
      }

      if (data.info && data.info.isBossRoom) {
        this.sound.play('midpoint');
        const ui = this.scene.get('UIScene');
        if (ui && ui.showMidpoint) {
          ui.showMidpoint('SURVIVE!');
        }
      }

      if (data.info && data.info.index === 1) {
        this.destroyIntroText();
      }
    });

    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasdKeys = this.input.keyboard.addKeys('W,A,S,D');
    this.inputBuffer = new InputBuffer(this);

    // UIScene is launched from LoadingScene and stays on top
    this.events.emit('updateChunks', gameState.clearedMazes);
    this.events.emit('updateKeys', this.hero.keys);
    this.events.emit('updateOxygen', this.hero.oxygen / this.hero.maxOxygen);

    // Debug: manually add a cleared chunk with M key
    this.input.keyboard.on('keydown-M', () => {
      gameState.incrementMazeCount();
      this.events.emit('updateChunks', gameState.clearedMazes);
      this.checkMeteorFieldActivation();
    });

    if (DEBUG_CHUNK_COUNTER) {
      this.input.keyboard.on('keydown-I', () => {
        gameState.incrementMazeCount();
        this.events.emit('updateChunks', gameState.clearedMazes);
        this.checkMeteorFieldActivation();
      });
      this.input.keyboard.on('keydown-U', () => {
        if (gameState.clearedMazes > 0) {
          gameState.clearedMazes -= 1;
          this.events.emit('updateChunks', gameState.clearedMazes);
          this.checkMeteorFieldActivation();
        }
      });
      this.events.emit('showDebugChunks', true);
    }

    this.input.keyboard.on('keydown-Q', () => {
      this.cameraManager.setZoom(Math.min(this.cameraManager.cam.zoom + 0.1, 2), 100);
    });

    this.input.keyboard.on('keydown-E', () => {
      this.cameraManager.setZoom(Math.max(this.cameraManager.cam.zoom - 0.1, 0.5), 100);
    });

    this.checkMeteorFieldActivation();
  }

  sortWorldObjects() {
    if (!this.worldLayer) return;
    this.worldLayer.list.sort((a, b) => {
      const da = a.depth || 0;
      const db = b.depth || 0;
      if (da !== db) {
        return da - db;
      }
      return (a.y || 0) - (b.y || 0);
    });
  }

  update() {
    const delta = this.game.loop.delta;

    const tileHere = this.mazeManager.worldToTile(
      this.heroSprite.x,
      this.heroSprite.y
    );
    if (
      this.stopTile &&
      tileHere &&
      tileHere.chunk.index === this.stopTile.chunkIndex &&
      tileHere.tx === this.stopTile.tx &&
      tileHere.ty === this.stopTile.ty
    ) {
      this.inputBuffer.clear();
      this.stopTile = null;
    }

    if (!this.isMoving && !this.isGameOver) {
      const entry = this.inputBuffer.consume();
      if (entry) {
        const size = this.mazeManager.tileSize;
        const dir = entry.dir;

        const calc = d => {
          let dx = 0, dy = 0;
          if (d === 'left') dx = -1;
          else if (d === 'right') dx = 1;
          else if (d === 'up') dy = -1;
          else if (d === 'down') dy = 1;
          const targetX = this.heroSprite.x + dx * size;
          const targetY = this.heroSprite.y + dy * size;
          const tileInfo = this.mazeManager.worldToTile(targetX, targetY);
          const entranceClosed =
            tileInfo &&
            tileInfo.chunk.entranceDoorSprite &&
            tileInfo.chunk.entranceDoorSprite.texture.key === 'exit' &&
            tileInfo.tx === tileInfo.chunk.chunk.entrance.x &&
            tileInfo.ty === tileInfo.chunk.chunk.entrance.y;
          const rivalBlock =
            this.rivalSprite &&
            this.rivalSprite.x === targetX &&
            this.rivalSprite.y === targetY;
          const blocked =
            (tileInfo &&
              (tileInfo.cell === TILE.WALL ||
                tileInfo.cell === TILE.REACTOR ||
                (tileInfo.cell === TILE.SILVER_DOOR && this.hero.keys === 0) ||
                (tileInfo.cell === TILE.DOOR && this.hero.keys === 0 && !tileInfo.chunk.chunk.exited && !tileInfo.chunk.chunk.doorOpen) ||
                (tileInfo.cell === TILE.AUTO_GATE &&
                  tileInfo.chunk.chunk.autoGates &&
                  tileInfo.chunk.chunk.autoGates.find(
                    g => g.x === tileInfo.tx && g.y === tileInfo.ty && g.closed
                  )) ||
                entranceClosed)) ||
            rivalBlock;
          return { blocked, targetX, targetY };
        };

        let { blocked, targetX, targetY } = calc(dir);
        let moveDir = dir;

        if (blocked && this.inputBuffer.holdOrder.length > 1) {
          for (const d2 of this.inputBuffer.holdOrder) {
            if (d2 === dir) continue;
            if ((isHorizontal(d2) && isHorizontal(dir)) || (isVertical(d2) && isVertical(dir))) continue;
            const alt = calc(d2);
            if (!alt.blocked) {
              ({ blocked, targetX, targetY } = alt);
              moveDir = d2;
              this.inputBuffer.promote(d2);
              break;
            }
          }
        }

        if (!blocked) {
          this.isMoving = true;
          const pixelsPerSecond = this.hero.speed;
          const duration = (size / pixelsPerSecond) * 1000;
          this.sound.play('hero_walk');

          let orientation = moveDir;
          if (moveDir === 'left') orientation = 'right';
          this.hero.direction = orientation;
          const frameMap = {
            down: ['hero_walk1', 'hero_walk2', 'hero_walk3'],
            up: ['hero_back_walk1', 'hero_back_walk2', 'hero_back_walk3'],
            right: ['hero_right_walk1', 'hero_right_walk2', 'hero_right_walk3']
          };
          const frames = frameMap[orientation];
          this.heroImage.setFlipX(moveDir === 'left');
          this.heroAnimIndex = 0;
          this.heroImage.setTexture(frames[0]);
          this.heroAnimationTimer = this.time.addEvent({
            delay: duration / frames.length,
            loop: true,
            callback: () => {
              this.heroAnimIndex = (this.heroAnimIndex + 1) % frames.length;
              this.heroImage.setTexture(frames[this.heroAnimIndex]);
            }
          });

          this.tweens.add({
            targets: this.heroSprite,
            x: targetX,
            y: targetY,
            duration,
            onComplete: () => {
              this.isMoving = false;
              if (this.heroAnimationTimer) {
                this.heroAnimationTimer.remove();
                this.heroAnimationTimer = null;
              }
              this.heroImage.setTexture(frames[0]);
              this.inputBuffer.repeat(moveDir);
            }
          });
        }
      }
    }

    this.mazeManager.update(delta, this.heroSprite);
    const curTile = this.mazeManager.worldToTile(this.heroSprite.x, this.heroSprite.y);
    if (curTile) {
      if (curTile.cell === TILE.CHEST && !curTile.chunk.chunk.chestOpened) {
        curTile.chunk.chunk.chestOpened = true;
        this.sound.play('chest_open');
        this.mazeManager.removeChest(curTile.chunk);
        this.hero.addKey();
        this.mazeManager.openAllSilverDoors(curTile.chunk);
        this.events.emit('updateKeys', this.hero.keys);
      }

      const tank =
        curTile.cell === TILE.OXYGEN &&
        curTile.chunk.chunk.airTanks &&
        curTile.chunk.chunk.airTanks.find(
          t => t.x === curTile.tx && t.y === curTile.ty && !t.collected
        );
      if (tank) {
        tank.collected = true;
        this.mazeManager.removeAirTank(curTile.chunk, tank.x, tank.y);
        const advanced = tank.advanced;
        this.sound.play('pick_up', { rate: advanced ? 0.8 : 1 });
        const amount = advanced ? 8 : 5;
        this.hero.oxygen = Math.min(
          this.hero.oxygen + amount,
          this.hero.maxOxygen
        );
        this.events.emit(
          'updateOxygen',
          this.hero.oxygen / this.hero.maxOxygen
        );
      }

      if (
        curTile.chunk.chunk.itemSwitch &&
        !curTile.chunk.chunk.itemSwitch.triggered &&
        curTile.chunk.chunk.itemSwitch.x === curTile.tx &&
        curTile.chunk.chunk.itemSwitch.y === curTile.ty
      ) {
        this.mazeManager.removeItemSwitch(curTile.chunk);
        this.sound.play('item_spawn');
        const advanced = Math.random() < 0.5;
        this.mazeManager.spawnAirTankDrop(curTile.chunk, advanced);
      }

      if (curTile.chunk.chunk.spikes) {
        const hit = curTile.chunk.chunk.spikes.find(
          s => s.x === curTile.tx && s.y === curTile.ty
        );
        const sameTile =
          hit &&
          this.lastSpikeTile &&
          this.lastSpikeTile.chunkIndex === curTile.chunk.index &&
          this.lastSpikeTile.x === curTile.tx &&
          this.lastSpikeTile.y === curTile.ty;
        if (hit && !sameTile) {
          this.cameras.main.flash(100, 0, 0, 0);
          this.cameraManager.shakeSmall();
          this.sound.play('spike_damage');
          this.hero.oxygen = Math.max(this.hero.oxygen - 1, 0);
          this.events.emit(
            'updateOxygen',
            this.hero.oxygen / this.hero.maxOxygen
          );
          if (this.hero.oxygen <= 0) {
            this.handleGameOver();
          }
          this.lastSpikeTile = {
            chunkIndex: curTile.chunk.index,
            x: curTile.tx,
            y: curTile.ty
          };
        } else if (!hit) {
          this.lastSpikeTile = null;
        }
      }

      if (curTile.chunk.chunk.electricMachines) {
        const hitMachine = curTile.chunk.chunk.electricMachines.find(m => {
          if (!m.active) return false;
          const dx = curTile.tx - m.x;
          const dy = curTile.ty - m.y;
          return (
            (Math.abs(dx) === 1 && dy === 0) ||
            (Math.abs(dy) === 1 && dx === 0)
          );
        });
        const sameElectric =
          hitMachine &&
          this.lastShockTile &&
          this.lastShockTile.chunkIndex === curTile.chunk.index &&
          this.lastShockTile.x === curTile.tx &&
          this.lastShockTile.y === curTile.ty;
        if (hitMachine && !sameElectric) {
          this.cameras.main.flash(100, 0, 0, 0);
          this.cameraManager.shakeSmall();
          this.sound.play('spike_damage');
          this.hero.oxygen = Math.max(this.hero.oxygen - 3, 0);
          this.events.emit(
            'updateOxygen',
            this.hero.oxygen / this.hero.maxOxygen
          );
          if (this.hero.oxygen <= 0) {
            this.handleGameOver();
          }
          this.lastShockTile = {
            chunkIndex: curTile.chunk.index,
            x: curTile.tx,
            y: curTile.ty
          };
        } else if (!hitMachine) {
          this.lastShockTile = null;
        }
      }

      if (curTile.cell === TILE.SILVER_DOOR && this.hero.keys > 0) {
        const doors = curTile.chunk.chunk.silverDoors || [];
        const door = doors.find(d => d.x === curTile.tx && d.y === curTile.ty);
        if (door && !door.opened) {
          this.mazeManager.openSilverDoor(
            curTile.chunk,
            curTile.tx,
            curTile.ty
          );
          this.sound.play('door_open');
        }
      }

      if (curTile.cell === TILE.DOOR && !curTile.chunk.chunk.exited) {
        if (curTile.chunk.chunk.doorOpen || this.hero.useKey()) {
          this.mazeManager.openDoor(curTile.chunk);
          this.sound.play('door_open');
          this.cameraManager.zoomHeroFocus();
          curTile.chunk.chunk.exited = true;
          gameState.incrementMazeCount();
          this.checkMeteorFieldActivation();
          if (MIDPOINTS.includes(gameState.clearedMazes)) {
            this.sound.play('midpoint');
            const ui = this.scene.get('UIScene');
            if (ui && ui.showMidpoint) {
              ui.showMidpoint(gameState.clearedMazes);
            }
          }
          this.events.emit('updateChunks', gameState.clearedMazes);
          this.events.emit('updateKeys', this.hero.keys);
          const nextInfo = this.mazeManager.spawnNext(
            gameState.clearedMazes,
            curTile.chunk,
            this.heroSprite
          );
          // Stop the hero one tile inside the new chunk on first entry
          let sx = nextInfo.chunk.entrance.x;
          let sy = nextInfo.chunk.entrance.y;
          switch (nextInfo.chunk.entry) {
            case 'N':
              sy += 1;
              break;
            case 'S':
              sy -= 1;
              break;
            case 'W':
              sx += 1;
              break;
            case 'E':
            default:
              sx -= 1;
              break;
          }
          this.stopTile = {
            chunkIndex: nextInfo.index,
            tx: sx,
            ty: sy
          };
          if (
            (gameState.clearedMazes === 1 ||
              gameState.clearedMazes === 15 ||
              gameState.clearedMazes === 30) &&
            !this.oxygenTimer
          ) {
            this.startOxygenTimer();
          }
        } else {
          if (curTile.chunk.doorSprite) {
            this.tweens.add({
              targets: curTile.chunk.doorSprite,
              x: '+=2',
              yoyo: true,
              duration: 50,
              repeat: 1
            });
          }
        }
      }
    }


  this.hero.moveTo(this.heroSprite.x, this.heroSprite.y);
  if (this.rival && this.rivalSprite) {
    this.rival.moveTo(this.rivalSprite.x, this.rivalSprite.y);
    const rTile = this.mazeManager.worldToTile(this.rivalSprite.x, this.rivalSprite.y);
    if (rTile) {
      const tank =
        rTile.cell === TILE.OXYGEN &&
        rTile.chunk.chunk.airTanks &&
        rTile.chunk.chunk.airTanks.find(
          t => t.x === rTile.tx && t.y === rTile.ty && !t.collected
        );
      if (tank) {
        tank.collected = true;
        this.mazeManager.removeAirTank(rTile.chunk, tank.x, tank.y);
        const advanced = tank.advanced;
        this.sound.play('pick_up', { rate: advanced ? 0.8 : 1 });
        const amount = advanced ? 8 : 5;
        this.rival.oxygen = Math.min(
          this.rival.oxygen + amount,
          this.rival.maxOxygen
        );
        this.events.emit(
          'updateRivalOxygen',
          this.rival.oxygen / this.rival.maxOxygen
        );
      }

      if (
        rTile.chunk.chunk.itemSwitch &&
        !rTile.chunk.chunk.itemSwitch.triggered &&
        rTile.chunk.chunk.itemSwitch.x === rTile.tx &&
        rTile.chunk.chunk.itemSwitch.y === rTile.ty
      ) {
        this.mazeManager.removeItemSwitch(rTile.chunk);
        this.sound.play('item_spawn');
        const adv = Math.random() < 0.5;
        this.mazeManager.spawnAirTankDrop(rTile.chunk, adv);
      }
    }
  }

    if (this.rivalSprite && !this.rivalMoving && !this.isGameOver) {
      let dirs = null;
      const target = this._findNearestRivalTarget();
      if (target) {
        dirs = this._dirsToward(target.x, target.y);
      } else {
        dirs = Phaser.Utils.Array.Shuffle(['up', 'down', 'left', 'right']);
      }
      const size = this.mazeManager.tileSize;
      const tryMove = dir => {
        let dx = 0,
          dy = 0;
        if (dir === 'left') dx = -1;
        else if (dir === 'right') dx = 1;
        else if (dir === 'up') dy = -1;
        else if (dir === 'down') dy = 1;
        const targetX = this.rivalSprite.x + dx * size;
        const targetY = this.rivalSprite.y + dy * size;
        if (this.heroSprite.x === targetX && this.heroSprite.y === targetY) return true;
        const tileInfo = this.mazeManager.worldToTile(targetX, targetY);
        const blocked =
          !tileInfo ||
          tileInfo.cell === TILE.WALL ||
          tileInfo.cell === TILE.REACTOR ||
          tileInfo.cell === TILE.SILVER_DOOR ||
          tileInfo.cell === TILE.DOOR ||
          (tileInfo.cell === TILE.AUTO_GATE &&
            tileInfo.chunk.chunk.autoGates &&
            tileInfo.chunk.chunk.autoGates.find(g => g.x === tileInfo.tx && g.y === tileInfo.ty && g.closed));
        if (blocked) return true;

        this.rivalMoving = true;
        const duration = (size / this.rival.speed) * 1000;
        const spawnTrail = () => {
          spawnAfterimage(
            this,
            this.rivalImage.texture.key,
            this.rivalSprite.x,
            this.rivalSprite.y,
            this.rivalImage.flipX
          );
        };
        spawnTrail();
        this.rivalTrailTimer = this.time.addEvent({
          delay: 50,
          loop: true,
          callback: spawnTrail
        });
        let orientation = dir;
        if (dir === 'left') orientation = 'right';
        const frameMap = {
          down: ['rival_walk1', 'rival_walk2', 'rival_walk3'],
          up: ['rival_back_walk1', 'rival_back_walk2', 'rival_back_walk3'],
          right: ['rival_right_walk1', 'rival_right_walk2', 'rival_right_walk3']
        };
        const frames = frameMap[orientation];
        this.rivalImage.setFlipX(dir === 'left');
        this.rivalAnimIndex = 0;
        this.rivalImage.setTexture(frames[0]);
        this.rivalAnimTimer = this.time.addEvent({
          delay: duration / frames.length,
          loop: true,
          callback: () => {
            this.rivalAnimIndex = (this.rivalAnimIndex + 1) % frames.length;
            this.rivalImage.setTexture(frames[this.rivalAnimIndex]);
          }
        });
        this.tweens.add({
          targets: this.rivalSprite,
          x: targetX,
          y: targetY,
          duration,
          onComplete: () => {
            this.rivalMoving = false;
            if (this.rivalAnimTimer) {
              this.rivalAnimTimer.remove();
              this.rivalAnimTimer = null;
            }
            if (this.rivalTrailTimer) {
              this.rivalTrailTimer.remove();
              this.rivalTrailTimer = null;
            }
            spawnTrail();
            this.rivalImage.setTexture(frames[0]);
          }
        });
        return true;
      };
      for (const d of dirs) {
        if (tryMove(d)) break;
      }
    }


    if (this.oxygenLine && this.oxygenConsole) {
      const hx = this.heroSprite.x;
      const hy = this.heroSprite.y;
      const cx = this.oxygenConsole.x;
      const cy = this.oxygenConsole.y;
      const points = computeTetherPoints(cx, cy, hx, hy, this.mazeManager.tileSize);
      this.oxygenLine.clear();
      this.oxygenLine.lineStyle(2, 0xffffff, 1);
      this.oxygenLine.beginPath();
      this.oxygenLine.moveTo(cx, cy);
      for (let i = 1; i < points.length; i++) {
        this.oxygenLine.lineTo(points[i].x, points[i].y);
      }
      this.oxygenLine.strokePath();
      this.oxygenLine.setDepth(hy > cy ? 9 : 11);
    }

    const inBossRoom = this._isInBossRoom();

    if (this.shield) {
      this.shield.sprite.setVisible(inBossRoom);
      if (inBossRoom) {
        this.shield.update();
      }
    }

    if (this.meteorField) {
      if (inBossRoom) {
        if (this.meteorField.spawnTimer && this.meteorField.spawnTimer.paused) {
          this.meteorField.start();
        }
        this.meteorField.update();
      } else {
        this.meteorField.stop();
        this.meteorField.clear();
      }
    }

    // Prevent camera drift by re-centering if needed
    this.cameraManager.maintainCenter();
    this.sortWorldObjects();
  }

  _isInBossRoom() {
    const curTile = this.mazeManager.worldToTile(
      this.heroSprite.x,
      this.heroSprite.y
    );
    return curTile && curTile.chunk && curTile.chunk.isBossRoom;
  }

  startOxygenTimer() {
    this.events.emit('updateOxygen', this.hero.oxygen / this.hero.maxOxygen);
    this.oxygenTimer = this.time.addEvent({
      delay: 1000,
      loop: true,
      callback: () => {
        this.hero.oxygen -= 1;
        this.events.emit('updateOxygen', this.hero.oxygen / this.hero.maxOxygen);
        if (this.hero.oxygen <= 0) {
          this.handleGameOver();
        }
      }
    });
  }

  startRivalOxygenTimer() {
    if (!this.rival) return;
    this.events.emit('updateRivalOxygen', this.rival.oxygen / this.rival.maxOxygen);
    this.rivalTimer = this.time.addEvent({
      delay: 1000,
      loop: true,
      callback: () => {
        this.rival.oxygen -= 1.5;
        this.events.emit('updateRivalOxygen', this.rival.oxygen / this.rival.maxOxygen);
        if (this.rival.oxygen <= 0) {
          this.handleRivalDeath();
        }
      }
    });
  }

  startRivalSwitchTimer() {
    if (!this.rival) return;
    const schedule = () => {
      this.rivalSwitchTimer = this.time.delayedCall(
        Phaser.Math.Between(2000, 4000),
        () => {
          if (!this.rival || this.isGameOver) return;
          const tile = this.mazeManager.worldToTile(this.rivalSprite.x, this.rivalSprite.y);
          if (tile) {
            this.mazeManager.spawnItemSwitch(tile.chunk);
          }
          schedule();
        }
      );
    };
    schedule();
  }

  _findNearestRivalTarget() {
    if (!this.rivalSprite) return null;
    const rx = this.rivalSprite.x;
    const ry = this.rivalSprite.y;
    const size = this.mazeManager.tileSize;
    let best = null;
    let bestDist = Infinity;
    for (const info of this.mazeManager.activeChunks) {
      if (
        info.itemSwitchSprite &&
        info.chunk.itemSwitch &&
        !info.chunk.itemSwitch.triggered
      ) {
        const wx = info.offsetX + info.itemSwitchPosition.x * size + size / 2;
        const wy = info.offsetY + info.itemSwitchPosition.y * size + size / 2;
        const d = Phaser.Math.Distance.Between(rx, ry, wx, wy);
        if (d < bestDist) {
          bestDist = d;
          best = { x: wx, y: wy };
        }
      }
      if (info.chunk.airTanks) {
        for (const t of info.chunk.airTanks) {
          if (t.collected) continue;
          const wx = info.offsetX + t.x * size + size / 2;
          const wy = info.offsetY + t.y * size + size / 2;
          const d = Phaser.Math.Distance.Between(rx, ry, wx, wy);
          if (d < bestDist) {
            bestDist = d;
            best = { x: wx, y: wy };
          }
        }
      }
    }
    return best;
  }

  _dirsToward(tx, ty) {
    const dirs = [];
    const dx = tx - this.rivalSprite.x;
    const dy = ty - this.rivalSprite.y;
    if (Math.abs(dx) > Math.abs(dy)) {
      dirs.push(dx > 0 ? 'right' : 'left');
      dirs.push(dy > 0 ? 'down' : 'up');
    } else {
      dirs.push(dy > 0 ? 'down' : 'up');
      dirs.push(dx > 0 ? 'right' : 'left');
    }
    const all = ['up', 'down', 'left', 'right'];
    Phaser.Utils.Array.Shuffle(all);
    for (const d of all) {
      if (!dirs.includes(d)) dirs.push(d);
    }
    return dirs;
  }

  spawnRival(info) {
    if (this.rival) return;
    const chunk = info.chunk;
    const size = chunk.size;
    const t = chunk.tiles;
    const candidates = [];
    for (let y = 1; y < size - 1; y++) {
      for (let x = 1; x < size - 1; x++) {
        if (t[y * size + x] !== TILE.FLOOR) continue;
        if (
          (chunk.entrance && Math.abs(chunk.entrance.x - x) <= 1 && Math.abs(chunk.entrance.y - y) <= 1) ||
          (chunk.door && Math.abs(chunk.door.x - x) <= 1 && Math.abs(chunk.door.y - y) <= 1)
        )
          continue;
        candidates.push({ x, y });
      }
    }
    if (candidates.length === 0) return;
    const spot = candidates[Math.floor(Math.random() * candidates.length)];
    const worldX = info.offsetX + spot.x * this.mazeManager.tileSize + this.mazeManager.tileSize / 2;
    const worldY = info.offsetY + spot.y * this.mazeManager.tileSize + this.mazeManager.tileSize / 2;

    this.rival = new RivalState();
    this.rivalImage = Characters.createRival(this);
    const ratio = this.rivalImage.height / this.rivalImage.width;
    this.rivalImage.setDisplaySize(this.mazeManager.tileSize, this.mazeManager.tileSize * ratio);
    this.rivalSprite = this.add.container(worldX, worldY, [this.rivalImage]);
    this.worldLayer.add(this.rivalSprite);
    this.startRivalOxygenTimer();
    this.startRivalSwitchTimer();
    this.events.emit('updateRivalOxygen', 1);
  }

  handleRivalDeath() {
    if (!this.rivalSprite) return;
    this.sound.play('game_over');
    if (this.rivalTimer) {
      this.rivalTimer.remove();
      this.rivalTimer = null;
    }
    if (this.rivalSwitchTimer) {
      this.rivalSwitchTimer.remove();
      this.rivalSwitchTimer = null;
    }
    if (this.rivalAnimTimer) {
      this.rivalAnimTimer.remove();
      this.rivalAnimTimer = null;
    }
    if (this.rivalTrailTimer) {
      this.rivalTrailTimer.remove();
      this.rivalTrailTimer = null;
    }
    this.tweens.killTweensOf(this.rivalSprite);
    const size = this.mazeManager.tileSize;
    const evaporate = () => {
      evaporateArea(
        this,
        this.rivalSprite.x - size / 2,
        this.rivalSprite.y - size,
        size,
        size * 2,
        0xffa500
      );
    };
    evaporate();
    const evapTimer = this.time.addEvent({ delay: 100, repeat: 5, callback: evaporate });
    this.rivalSprite.setVisible(false);
    this.events.emit('updateRivalOxygen', 0);
    this.time.delayedCall(1000, () => {
      evapTimer.remove();
      this.rivalSprite.destroy();
      this.rivalSprite = null;
      this.rivalImage = null;
      this.rival = null;
    });
  }

  checkMeteorFieldActivation() {
    if (this.meteorField && this.meteorField.spawnTimer) {
      const inBossRoom = this._isInBossRoom();
      if (inBossRoom && this.meteorField.spawnTimer.paused) {
        this.meteorField.start();
      } else if (!inBossRoom && !this.meteorField.spawnTimer.paused) {
        this.meteorField.stop();
        this.meteorField.clear();
      }
    }
  }

  handleGameOver() {
    if (this.isGameOver) return;
    this.isGameOver = true;
    if (this.oxygenTimer) {
      this.oxygenTimer.remove();
      this.oxygenTimer = null;
    }
    if (this.rivalTimer) {
      this.rivalTimer.remove();
      this.rivalTimer = null;
    }
    if (this.rivalSwitchTimer) {
      this.rivalSwitchTimer.remove();
      this.rivalSwitchTimer = null;
    }
    if (this.bgm) {
      this.bgm.stop();
    }
    if (this.bossBgm1) {
      this.bossBgm1.stop();
    }
    if (this.bossBgm2) {
      this.bossBgm2.stop();
    }
    this.sound.stopAll();
    this.sound.play('game_over');

    this.tweens.killTweensOf(this.heroSprite);
    if (this.rivalSprite) {
      this.tweens.killTweensOf(this.rivalSprite);
    }
    if (this.heroAnimationTimer) {
      this.heroAnimationTimer.remove();
      this.heroAnimationTimer = null;
    }
    if (this.rivalAnimTimer) {
      this.rivalAnimTimer.remove();
      this.rivalAnimTimer = null;
    }
    if (this.rivalTrailTimer) {
      this.rivalTrailTimer.remove();
      this.rivalTrailTimer = null;
    }
    this.isMoving = false;

    const size = this.mazeManager.tileSize;
    const evaporate = () => {
      evaporateArea(
        this,
        this.heroSprite.x - size / 2,
        this.heroSprite.y - size,
        size,
        size * 2,
        0xaee868
      );
    };
    evaporate();
    const evapTimer = this.time.addEvent({
      delay: 100,
      repeat: 5,
      callback: evaporate
    });

    this.heroSprite.setVisible(false);

    this.time.delayedCall(1000, () => {
      evapTimer.remove();
      this.heroSprite.destroy();
      this.scene.launch('GameOverScene');
      this.scene.bringToTop('GameOverScene');
      this.scene.pause();
    });
  }

  destroyIntroText() {
    const ui = this.scene.get('UIScene');
    if (ui && ui.destroyIntroText) {
      ui.destroyIntroText();
    }
  }
}

const config = {
  type: Phaser.AUTO,
  width: VIRTUAL_WIDTH * 2,
  height: VIRTUAL_HEIGHT * 2,
  parent: 'game-container',
  pixelArt: true,
  roundPixels: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: VIRTUAL_WIDTH * 2,
    height: VIRTUAL_HEIGHT * 2
  },
  scene: [LoadingScene, GameScene, UIScene, GameOverScene]
};

Characters.ready.then(() => {
  const game = new Phaser.Game(config);
  window.addEventListener('resize', () => game.scale.refresh());
});

