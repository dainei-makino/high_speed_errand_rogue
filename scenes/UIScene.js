export default class UIScene extends Phaser.Scene {
  constructor() {
    super('UIScene');
  }

  create() {
    const gameScene = this.scene.get('GameScene');
    this.gameState = gameScene.gameState;
    this.cameras.main.setViewport(0, 0, 960, 540);
    this.cameras.main.roundPixels = true;

    this.mazeText = this.add.text(12, 8, `Mazes Cleared: ${this.gameState.clearedMazes}`, {
      fontSize: '16px',
      color: '#ffffff'
    });
    this.mazeText.setScrollFactor(0);

    gameScene.events.on('mazeCountChanged', count => {
      this.mazeText.setText(`Mazes Cleared: ${count}`);
    });

    this.scale.on('resize', (gw, gh) => {
      this.cameras.main.setViewport((gw - 960) / 2, (gh - 540) / 2, 960, 540);
    });
  }
}
