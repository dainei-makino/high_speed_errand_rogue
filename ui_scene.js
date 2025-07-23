const VIRTUAL_WIDTH = 480;
const VIRTUAL_HEIGHT = 270;

export default class UIScene extends Phaser.Scene {
  constructor() {
    super({ key: 'UIScene', active: false });
  }

  create() {
    // Center viewport for virtual resolution
    const { width, height } = this.scale.gameSize;
    this.cameras.main.setViewport((width - VIRTUAL_WIDTH * 2) / 2, (height - VIRTUAL_HEIGHT * 2) / 2, VIRTUAL_WIDTH * 2, VIRTUAL_HEIGHT * 2);

    this.scoreText = this.add.text(12, 8, 'SCORE 000000', {
      fontFamily: 'monospace',
      fontSize: '16px',
      color: '#ffffff'
    });

    const gameScene = this.scene.get('GameScene');
    gameScene.events.on('updateScore', this.updateScore, this);


    this.fpsText = this.add.text(420, 8, '', {
      fontFamily: 'monospace',
      fontSize: '16px',
      color: '#ffffff'
    });

    this.scale.on('resize', (gw, gh) => {
      this.cameras.main.setViewport((gw - VIRTUAL_WIDTH * 2) / 2, (gh - VIRTUAL_HEIGHT * 2) / 2, VIRTUAL_WIDTH * 2, VIRTUAL_HEIGHT * 2);
    });
  }

  update() {
    if (this.fpsText) {
      this.fpsText.setText('FPS ' + Math.floor(this.game.loop.actualFps));
    }
  }

  updateScore(score) {
    this.scoreText.setText('SCORE ' + score.toString().padStart(6, '0'));
  }
}
