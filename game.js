import GameState from './game-state.js';
import HeroState from './hero_state.js';
import CameraManager from './camera.js';
import MazeManager from './maze_manager.js';
import { TILE } from './maze_generator_core.js';
import Characters from './characters.js';
import InputBuffer from './input_buffer.js';
import UIScene from './ui_scene.js';

const VIRTUAL_WIDTH = 480;
const VIRTUAL_HEIGHT = 270;

// Global state for tracking overall game progress
const gameState = new GameState();

class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
    this.isMoving = false;
  }

  preload() {
    Characters.registerTextures(this);
  }

  create() {
    this.hero = new HeroState();
    this.isMoving = false;

    this.worldLayer = this.add.container(0, 0);
    this.mazeManager = new MazeManager(this);
    const firstInfo = this.mazeManager.spawnInitial();

    this.heroSprite = Characters.createHero(this);
    this.heroSprite.setDisplaySize(this.mazeManager.tileSize, this.mazeManager.tileSize);
    this.heroSprite.x = firstInfo.offsetX + firstInfo.chunk.entrance.x * this.mazeManager.tileSize + this.mazeManager.tileSize / 2;
    this.heroSprite.y = firstInfo.offsetY + firstInfo.chunk.entrance.y * this.mazeManager.tileSize + this.mazeManager.tileSize / 2;
    this.worldLayer.add(this.heroSprite);

    this.cameras.main.setBounds(-1000, -1000, 10000, 10000);
    this.cameraManager = new CameraManager(this, this.mazeManager);
    this.cameraManager.panToChunk(firstInfo, 0);
    this.mazeManager.events.on('chunk-added', info => {
      if (info !== firstInfo) {
        this.cameraManager.panToChunk(info);
        this.cameraManager.zoomBump();
      }
    });

    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasdKeys = this.input.keyboard.addKeys('W,A,S,D');
    this.inputBuffer = new InputBuffer(this);

    this.scene.launch('UIScene');
    this.events.emit('updateScore', gameState.clearedMazes);

    this.input.keyboard.on('keydown-M', () => {
      gameState.incrementMazeCount();
      this.events.emit('updateScore', gameState.clearedMazes);
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

    if (!this.isMoving) {
      const entry = this.inputBuffer.consume();
      if (entry) {
        let dx = 0;
        let dy = 0;
        const dir = entry.dir;
        if (dir === 'left') dx = -1;
        else if (dir === 'right') dx = 1;
        else if (dir === 'up') dy = -1;
        else if (dir === 'down') dy = 1;

        const size = this.mazeManager.tileSize;
        const targetX = this.heroSprite.x + dx * size;
        const targetY = this.heroSprite.y + dy * size;
        const tileInfo = this.mazeManager.worldToTile(targetX, targetY);
        if (!tileInfo || tileInfo.cell !== TILE.WALL) {
          this.isMoving = true;
          this.tweens.add({
            targets: this.heroSprite,
            x: targetX,
            y: targetY,
            duration: 120,
            onComplete: () => {
              this.isMoving = false;
              this.inputBuffer.repeat(dir);
            }
          });
        }
      }
    }

    this.mazeManager.update(delta, this.heroSprite);
    const curTile = this.mazeManager.worldToTile(this.heroSprite.x, this.heroSprite.y);
    if (curTile && curTile.cell === TILE.DOOR && !curTile.chunk.chunk.exited) {
      curTile.chunk.chunk.exited = true;
      gameState.incrementMazeCount();
      this.events.emit('updateScore', gameState.clearedMazes);
      this.mazeManager.spawnNext(gameState.clearedMazes, curTile.chunk, this.heroSprite);
    }

    this.hero.moveTo(this.heroSprite.x, this.heroSprite.y);
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
  scene: [GameScene, UIScene]
};

Characters.ready.then(() => {
  const game = new Phaser.Game(config);
  window.addEventListener('resize', () => game.scale.refresh());
});

