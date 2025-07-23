import GameState from './game-state.js';
import HeroState from './hero_state.js';
import CameraController from './camera.js';
import { generateChunk } from './maze.js';
import MazeManager from './maze_manager.js';

const TILE_SIZE = 32;
const gameState = new GameState();

const config = {
  type: Phaser.AUTO,
  width: 480,
  height: 270,
  parent: 'game-container',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 480,
    height: 270
  },
  scene: {
    preload,
    create,
    update
  }
};

function preload() {
  // No assets yet
}

let hero;
let heroSprite;
let cursors;
let cameraController;
let uiLayer;
let mazeManager;
let heroChunkObj;
let heroPos = { x: 0, y: 0 };

function create() {
  hero = new HeroState();
  this.worldLayer = this.add.container(0, 0);

  mazeManager = new MazeManager(this, gameState, TILE_SIZE);
  heroSprite = this.add.rectangle(0, 0, TILE_SIZE, TILE_SIZE, 0x00ff00).setOrigin(0);
  this.worldLayer.add(heroSprite);

  const firstChunk = generateChunk(0);
  heroChunkObj = mazeManager.addChunk(firstChunk, 0, 0);
  heroPos.x = firstChunk.entrance.x;
  heroPos.y = firstChunk.entrance.y;
  const pos = mazeManager.worldPos(heroChunkObj, heroPos.x, heroPos.y);
  heroSprite.x = pos.x;
  heroSprite.y = pos.y;

  uiLayer = this.add.container(0, 0);
  uiLayer.setScrollFactor(0);

  this.cameras.main.setBounds(-1000, -1000, 2000, 2000);
  cameraController = new CameraController(this);
  cameraController.follow(heroSprite);

  cursors = this.input.keyboard.createCursorKeys();

  this.mazeText = this.add.text(10, 10, `Mazes Cleared: ${gameState.clearedMazes}`, {
    fontSize: '16px',
    color: '#ffffff'
  });
  this.mazeText.setScrollFactor(0);
  uiLayer.add(this.mazeText);

  this.gameOverText = this.add.text(240, 135, 'GAME OVER', { fontSize: '32px', color: '#ff0000' }).setOrigin(0.5);
  this.gameOverText.setScrollFactor(0);
  this.gameOverText.visible = false;

  this.gameOver = () => {
    this.gameOverText.visible = true;
    this.scene.pause();
  };
}

function moveHero(dx, dy) {
  const chunk = heroChunkObj.chunk;
  const cell = chunk.tiles[heroPos.y][heroPos.x];
  const dirMap = { '-1,0': 'W', '1,0': 'E', '0,-1': 'N', '0,1': 'S' };
  const dir = dirMap[`${dx},${dy}`];
  if (dir && cell.walls[dir]) return;

  const nx = heroPos.x + dx;
  const ny = heroPos.y + dy;
  if (nx < 0 || ny < 0 || nx >= chunk.width || ny >= chunk.height) return;
  heroPos.x = nx;
  heroPos.y = ny;
  const pos = mazeManager.worldPos(heroChunkObj, heroPos.x, heroPos.y);
  heroSprite.x = pos.x;
  heroSprite.y = pos.y;
  hero.moveTo(heroSprite.x, heroSprite.y);

  const newCell = chunk.tiles[heroPos.y][heroPos.x];
  if (newCell.type === 'exit') {
    gameState.incrementMazeCount();
    this.mazeText.setText(`Mazes Cleared: ${gameState.clearedMazes}`);
    const nextChunk = generateChunk(gameState.clearedMazes);
    const offsetX = heroChunkObj.x + chunk.width * TILE_SIZE;
    const offsetY = heroChunkObj.y;
    heroChunkObj = mazeManager.addChunk(nextChunk, offsetX, offsetY);
    const startPos = mazeManager.worldPos(heroChunkObj, nextChunk.entrance.x, nextChunk.entrance.y);
    heroPos.x = nextChunk.entrance.x;
    heroPos.y = nextChunk.entrance.y;
    heroSprite.x = startPos.x;
    heroSprite.y = startPos.y;
    cameraController.panTo(heroSprite.x, heroSprite.y, 400);
  } else if (newCell.type === 'chest' || newCell.type === 'itemChest') {
    newCell.rect.fillColor = 0x222222;
  }
}

function update() {
  if (Phaser.Input.Keyboard.JustDown(cursors.left)) moveHero.call(this, -1, 0);
  else if (Phaser.Input.Keyboard.JustDown(cursors.right)) moveHero.call(this, 1, 0);
  else if (Phaser.Input.Keyboard.JustDown(cursors.up)) moveHero.call(this, 0, -1);
  else if (Phaser.Input.Keyboard.JustDown(cursors.down)) moveHero.call(this, 0, 1);

  mazeManager.fadeOldChunks(heroChunkObj.chunk);
}

const game = new Phaser.Game(config);
window.addEventListener('resize', () => game.scale.refresh());
