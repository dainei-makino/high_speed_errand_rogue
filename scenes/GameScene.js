import GameState from '../game-state.js';
import HeroState from '../hero_state.js';
import CameraController from '../camera.js';
import MazeManager from '../maze_manager.js';
import Characters from '../characters.js';
import InputBuffer from '../input_buffer.js';

export default class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
  }

  preload() {
    Characters.registerTextures(this);
  }

  create() {
    this.gameState = new GameState();
    this.hero = new HeroState();
    this.isMoving = false;

    this.worldLayer = this.add.container(0, 0);
    this.mazeManager = new MazeManager(this);
    const firstChunk = this.mazeManager.spawnInitial();
    this.heroSprite = Characters.createHero(this);
    this.heroSprite.setDisplaySize(this.mazeManager.tileSize, this.mazeManager.tileSize);
    this.heroSprite.x = firstChunk.entrance.x * this.mazeManager.tileSize + this.mazeManager.tileSize / 2;
    this.heroSprite.y = firstChunk.entrance.y * this.mazeManager.tileSize + this.mazeManager.tileSize / 2;
    this.worldLayer.add(this.heroSprite);

    this.cameras.main.setBounds(-1000, -1000, 10000, 10000);
    this.cameras.main.roundPixels = true;
    this.cameraController = new CameraController(this);
    this.cameraController.follow(this.heroSprite);

    this.inputBuffer = new InputBuffer(this);

    this.scene.launch('UIScene');
    this.events.emit('mazeCountChanged', this.gameState.clearedMazes);
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
        if (!tileInfo || tileInfo.cell.type !== 'wall') {
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
    if (curTile && curTile.cell.type === 'exit' && !curTile.chunk.chunk.exited) {
      curTile.chunk.chunk.exited = true;
      this.gameState.incrementMazeCount();
      this.events.emit('mazeCountChanged', this.gameState.clearedMazes);
      this.mazeManager.spawnNext(this.gameState.clearedMazes, curTile.chunk, this.heroSprite);
    }

    this.hero.moveTo(this.heroSprite.x, this.heroSprite.y);
  }
}
