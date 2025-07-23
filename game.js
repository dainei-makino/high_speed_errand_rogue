import GameState from './game-state.js';
import HeroState from './hero_state.js';
import CameraController from './camera.js';
import MazeManager from './maze_manager.js';

// Global state for tracking overall game progress
const gameState = new GameState();

const config = {
  type: Phaser.AUTO,
  width: 960,
  height: 540,
  parent: 'game-container',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 960,
    height: 540
  },
  scene: {
    preload,
    create,
    update
  }
};

function preload() {
  Characters.registerTextures(this);
}

let hero;
let heroSprite;
let cursors;
let wasdKeys;
let cameraController;
let uiLayer;
let mazeManager;
let isMoving = false;

function create() {
  this.add.text(240, 40, 'Hello Phaser!', { fontSize: '32px', color: '#ffffff' }).setOrigin(0.5);
  this.hero = Characters.createHero(this);
  this.hero.setPosition(240, 135);
  hero = new HeroState();
  isMoving = false;

  this.worldLayer = this.add.container(0, 0);
  mazeManager = new MazeManager(this);
  const firstChunk = mazeManager.spawnInitial();
  heroSprite = this.add.rectangle(0, 0, 16, 16, 0x00ff00);
  heroSprite.x = firstChunk.entrance.x * 16 + 8;
  heroSprite.y = firstChunk.entrance.y * 16 + 8;
  this.worldLayer.add(heroSprite);

  uiLayer = this.add.container(0, 0);
  uiLayer.setScrollFactor(0);

  this.cameras.main.setBounds(-1000, -1000, 10000, 10000);
  cameraController = new CameraController(this);
  cameraController.follow(heroSprite);

  cursors = this.input.keyboard.createCursorKeys();
  wasdKeys = this.input.keyboard.addKeys('W,A,S,D');

  this.mazeText = this.add.text(10, 10, `Mazes Cleared: ${gameState.clearedMazes}`, {
    fontSize: '16px',
    color: '#ffffff'
  });
  this.mazeText.setScrollFactor(0);
  uiLayer.add(this.mazeText);

  this.input.keyboard.on('keydown-M', () => {
    gameState.incrementMazeCount();
    this.mazeText.setText(`Mazes Cleared: ${gameState.clearedMazes}`);
  });

  this.input.keyboard.on('keydown-Q', () => {
    cameraController.setZoom(Math.min(cameraController.camera.zoom + 0.1, 2), 100);
  });

  this.input.keyboard.on('keydown-E', () => {
    cameraController.setZoom(Math.max(cameraController.camera.zoom - 0.1, 0.5), 100);
  });
}

function update() {
  const delta = this.game.loop.delta;

  if (!isMoving) {
    let dx = 0;
    let dy = 0;
    if (Phaser.Input.Keyboard.JustDown(cursors.left) || Phaser.Input.Keyboard.JustDown(wasdKeys.A)) {
      dx = -1;
    } else if (Phaser.Input.Keyboard.JustDown(cursors.right) || Phaser.Input.Keyboard.JustDown(wasdKeys.D)) {
      dx = 1;
    } else if (Phaser.Input.Keyboard.JustDown(cursors.up) || Phaser.Input.Keyboard.JustDown(wasdKeys.W)) {
      dy = -1;
    } else if (Phaser.Input.Keyboard.JustDown(cursors.down) || Phaser.Input.Keyboard.JustDown(wasdKeys.S)) {
      dy = 1;
    }

    if (dx !== 0 || dy !== 0) {
      const size = mazeManager.tileSize;
      const targetX = heroSprite.x + dx * size;
      const targetY = heroSprite.y + dy * size;
      const tileInfo = mazeManager.worldToTile(targetX, targetY);
      if (!tileInfo || tileInfo.cell.type !== 'wall') {
        isMoving = true;
        this.tweens.add({
          targets: heroSprite,
          x: targetX,
          y: targetY,
          duration: 120,
          onComplete: () => {
            isMoving = false;
          }
        });
      }
    }
  }

  mazeManager.update(delta, heroSprite);
  const curTile = mazeManager.worldToTile(heroSprite.x, heroSprite.y);
  if (curTile && curTile.cell.type === 'exit' && !curTile.chunk.chunk.exited) {
    curTile.chunk.chunk.exited = true;
    gameState.incrementMazeCount();
    this.mazeText.setText(`Mazes Cleared: ${gameState.clearedMazes}`);
    mazeManager.spawnNext(gameState.clearedMazes, curTile.chunk, heroSprite);
  }

  hero.moveTo(heroSprite.x, heroSprite.y);
}

Characters.ready.then(() => {
  const game = new Phaser.Game(config);
  window.addEventListener('resize', () => game.scale.refresh());
});
