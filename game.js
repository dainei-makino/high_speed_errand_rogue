import GameState from './game-state.js';
import HeroState from './hero_state.js';
import CameraController from './camera.js';

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
  // preload assets here (none for minimal setup)
}

let hero;
let heroSprite;
let cursors;
let cameraController;
let uiLayer;

function create() {
  hero = new HeroState();

  this.worldLayer = this.add.container(0, 0);
  heroSprite = this.add.rectangle(0, 0, 16, 16, 0x00ff00);
  this.worldLayer.add(heroSprite);

  uiLayer = this.add.container(0, 0);
  uiLayer.setScrollFactor(0);

  this.cameras.main.setBounds(-500, -500, 1000, 1000);
  cameraController = new CameraController(this);
  cameraController.follow(heroSprite);

  cursors = this.input.keyboard.createCursorKeys();

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
  const speed = hero.speed;
  if (cursors.left.isDown) {
    heroSprite.x -= speed * this.game.loop.delta / 1000;
  } else if (cursors.right.isDown) {
    heroSprite.x += speed * this.game.loop.delta / 1000;
  }

  if (cursors.up.isDown) {
    heroSprite.y -= speed * this.game.loop.delta / 1000;
  } else if (cursors.down.isDown) {
    heroSprite.y += speed * this.game.loop.delta / 1000;
  }

  hero.moveTo(heroSprite.x, heroSprite.y);
}

const game = new Phaser.Game(config);
window.addEventListener('resize', () => game.scale.refresh());
