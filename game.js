import gameState from './game-state.js';
import HeroState from './hero_state.js';
import CameraManager from './camera.js';
import MazeManager from './maze_manager.js';
import { TILE } from './maze_generator_core.js';
import Characters from './characters.js';
import InputBuffer from './input_buffer.js';
import UIScene from './ui_scene.js';
import { newChunkTransition, evaporateArea } from './effects.js';
import LoadingScene from './loading_scene.js';
import StarField from './star_field.js';
import GameOverScene from './game_over_scene.js';

const MIDPOINTS = [5, 10, 15, 20, 30, 40, 50];

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
    this.bgm = null;
    this.isGameOver = false;
  }

  preload() {
    Characters.registerTextures(this);
  }

  create() {
    this.hero = new HeroState();
    this.isMoving = false;
    this.isGameOver = false;

    this.sound.stopAll();
    this.bgm = this.sound.add('bgm', { loop: true });

    this.worldLayer = this.add.container(0, 0);
    this.mazeManager = new MazeManager(this);

    this.cameraManager = new CameraManager(this, this.mazeManager);
    this.starField = new StarField(this);
    this._seenFirstChunk = false;
    this.mazeManager.events.on('chunk-created', info => {
      this.cameraManager.expandBounds(info);
      const dur = this._seenFirstChunk ? 400 : 0;
      this.cameraManager.panToChunk(info, dur);
      if (this._seenFirstChunk) {
        this.cameraManager.zoomBump();
      }
      this._seenFirstChunk = true;
    });

    const firstInfo = this.mazeManager.spawnInitial();
    this.sound.play('chunk_generate_1');

    this.heroImage = Characters.createHero(this);
    const heroRatio = this.heroImage.height / this.heroImage.width;
    this.heroImage.setDisplaySize(
      this.mazeManager.tileSize,
      this.mazeManager.tileSize * heroRatio
    );
    this.heroImage.y = -4; // shift sprite up for depth effect

    this.heroSprite = this.add.container(0, 0, [this.heroImage]);
    this.heroSprite.x = firstInfo.offsetX + firstInfo.chunk.entrance.x * this.mazeManager.tileSize + this.mazeManager.tileSize / 2;
    this.heroSprite.y = firstInfo.offsetY + firstInfo.chunk.entrance.y * this.mazeManager.tileSize + this.mazeManager.tileSize / 2;
    this.worldLayer.add(this.heroSprite);

    // Persistent key display above the hero
    this.keyDisplay = this.add.container(this.heroSprite.x - 10, this.heroSprite.y - this.mazeManager.tileSize);
    this.keyIcon = Characters.createKey(this);
    this.keyIcon.setDisplaySize(this.mazeManager.tileSize, this.mazeManager.tileSize);
    this.keyCountText = this.add.text(this.mazeManager.tileSize / 2, 0, '', {
      fontFamily: 'monospace',
      fontSize: '16px',
      color: '#ffffff'
    }).setOrigin(0, 0.5);
    this.keyDisplay.add([this.keyIcon, this.keyCountText]);
    this.worldLayer.add(this.keyDisplay);
    this.updateKeyDisplay();

    // Handle transitions for door exit
    this.mazeManager.events.on('spawn-next', data => {
      newChunkTransition(this, data.doorDir, data.doorWorldX, data.doorWorldY);
      this.sound.play('chunk_generate_2');
      if (data.info && data.info.index === 1) {
        this.bgm.play();
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
    });

    this.input.keyboard.on('keydown-Q', () => {
      this.cameraManager.setZoom(Math.min(this.cameraManager.cam.zoom + 0.1, 2), 100);
    });

    this.input.keyboard.on('keydown-E', () => {
      this.cameraManager.setZoom(Math.max(this.cameraManager.cam.zoom - 0.1, 0.5), 100);
    });
  }

  update() {
    const delta = this.game.loop.delta;

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
          const blocked = tileInfo && (
            tileInfo.cell === TILE.WALL ||
            (tileInfo.cell === TILE.SILVER_DOOR && this.hero.keys === 0) ||
            (tileInfo.cell === TILE.DOOR && this.hero.keys === 0 && !tileInfo.chunk.chunk.exited) ||
            (tileInfo.cell === TILE.AUTO_GATE &&
              tileInfo.chunk.chunk.autoGates &&
              tileInfo.chunk.chunk.autoGates.find(g => g.x === tileInfo.tx && g.y === tileInfo.ty && g.closed))
          );
          return { blocked, targetX, targetY };
        };

        let { blocked, targetX, targetY } = calc(dir);
        let moveDir = dir;

        if (blocked && this.inputBuffer.holdOrder.length > 1) {
          const isH = d => d === 'left' || d === 'right';
          const isV = d => d === 'up' || d === 'down';
          for (const d2 of this.inputBuffer.holdOrder) {
            if (d2 === dir) continue;
            if ((isH(d2) && isH(dir)) || (isV(d2) && isV(dir))) continue;
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
        this.updateKeyDisplay();
        const icon = Characters.createKey(this);
        icon.setDisplaySize(this.mazeManager.tileSize, this.mazeManager.tileSize);
        icon.setPosition(this.heroSprite.x, this.heroSprite.y - this.mazeManager.tileSize);
        this.worldLayer.add(icon);
        this.tweens.add({
          targets: icon,
          y: icon.y - this.mazeManager.tileSize,
          alpha: 0,
          duration: 1000,
          onComplete: () => icon.destroy()
        });
        this.events.emit('updateKeys', this.hero.keys);
      }

      if (curTile.cell === TILE.OXYGEN && curTile.chunk.chunk.airTank && !curTile.chunk.chunk.airTank.collected) {
        this.mazeManager.removeAirTank(curTile.chunk);
        this.hero.oxygen = Math.min(this.hero.oxygen + 5, this.hero.maxOxygen);
        this.events.emit('updateOxygen', this.hero.oxygen / this.hero.maxOxygen);
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
        if (this.hero.useKey()) {
          this.updateKeyDisplay();
          this.mazeManager.openDoor(curTile.chunk);
          this.sound.play('door_open');
          this.cameraManager.zoomHeroFocus();
          curTile.chunk.chunk.exited = true;
          gameState.incrementMazeCount();
          if (MIDPOINTS.includes(gameState.clearedMazes)) {
            this.sound.play('midpoint');
            if (this.bgm) {
              this.bgm.stop();
              this.bgm.play();
            }
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
          if (gameState.clearedMazes === 1 && !this.oxygenTimer) {
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

    this.keyDisplay.x = this.heroSprite.x - 10;
    this.keyDisplay.y = this.heroSprite.y - this.mazeManager.tileSize;

    this.hero.moveTo(this.heroSprite.x, this.heroSprite.y);

    // Prevent camera drift by re-centering if needed
    this.cameraManager.maintainCenter();
  }

  updateKeyDisplay() {
    const count = this.hero.keys;
    if (count <= 0) {
      this.keyDisplay.setVisible(false);
    } else {
      this.keyDisplay.setVisible(true);
      if (count === 1) {
        this.keyCountText.setVisible(false);
      } else {
        this.keyCountText.setVisible(true);
        this.keyCountText.setText('x' + count);
      }
    }
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

  handleGameOver() {
    if (this.isGameOver) return;
    this.isGameOver = true;
    if (this.oxygenTimer) {
      this.oxygenTimer.remove();
      this.oxygenTimer = null;
    }
    if (this.bgm) {
      this.bgm.stop();
    }
    this.sound.stopAll();
    this.sound.play('game_over');

    this.tweens.killTweensOf(this.heroSprite);
    if (this.heroAnimationTimer) {
      this.heroAnimationTimer.remove();
      this.heroAnimationTimer = null;
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
        0x000000
      );
    };
    evaporate();
    const evapTimer = this.time.addEvent({
      delay: 100,
      repeat: 19,
      callback: evaporate
    });

    this.heroSprite.setVisible(false);

    this.time.delayedCall(2000, () => {
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

