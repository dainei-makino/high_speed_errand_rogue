class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });
    this.renderer = null;
    this.cameraController = null;
  }

  preload() {
    this.renderer = new GameRenderer(this);
    this.renderer.preload();
  }

  create() {
    this.cameraController = new GameCamera(this.cameras.main);
    this.renderer.create();
  }

  update(time, delta) {
    this.renderer.update(time, delta);
  }
}

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
  scene: GameScene
};

const game = new Phaser.Game(config);
window.addEventListener('resize', () => game.scale.refresh());
