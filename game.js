import GameState from './game-state.js';
import HeroState from './hero_state.js';
import CameraManager from './camera.js';
import MazeManager from './maze_manager.js';
import Characters from './characters.js';
import InputBuffer from './input_buffer.js';

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
let cameraManager;
let inputBuffer;
let uiLayer;
let mazeManager;
let isMoving = false;

function create() {
  hero = new HeroState();
  isMoving = false;

  this.worldLayer = this.add.container(0, 0);
  mazeManager = new MazeManager(this);
  const firstInfo = mazeManager.spawnInitial();
  heroSprite = Characters.createHero(this);
  heroSprite.setDisplaySize(mazeManager.tileSize, mazeManager.tileSize);
  heroSprite.x = firstInfo.offsetX + firstInfo.chunk.entrance.x * mazeManager.tileSize + mazeManager.tileSize / 2;
  heroSprite.y = firstInfo.offsetY + firstInfo.chunk.entrance.y * mazeManager.tileSize + mazeManager.tileSize / 2;
  this.worldLayer.add(heroSprite);

  uiLayer = this.add.container(0, 0);
  uiLayer.setScrollFactor(0);

  this.cameras.main.setBounds(-1000, -1000, 10000, 10000);
  cameraManager = new CameraManager(this, mazeManager);
  cameraManager.panToChunk(firstInfo, 0);
  mazeManager.events.on('chunk-added', info => {
    if (info !== firstInfo) {
      cameraManager.panToChunk(info);
      cameraManager.zoomBump();
    }
  });

  cursors = this.input.keyboard.createCursorKeys();
  wasdKeys = this.input.keyboard.addKeys('W,A,S,D');
  inputBuffer = new InputBuffer(this);

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
    cameraManager.setZoom(Math.min(cameraManager.cam.zoom + 0.1, 2), 100);
  });

  this.input.keyboard.on('keydown-E', () => {
    cameraManager.setZoom(Math.max(cameraManager.cam.zoom - 0.1, 0.5), 100);
  });
}

function update() {
  const delta = this.game.loop.delta;

  if (!isMoving) {
    const entry = inputBuffer.consume();
    if (entry) {
      let dx = 0;
      let dy = 0;
      const dir = entry.dir;
      if (dir === 'left') dx = -1;
      else if (dir === 'right') dx = 1;
      else if (dir === 'up') dy = -1;
      else if (dir === 'down') dy = 1;

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
            inputBuffer.repeat(dir);
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
