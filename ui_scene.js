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

    // Display cleared chunk count; left aligned with no zero padding
    this.chunkText = this.add.text(12, 8, 'CHUNK 0', {
      fontFamily: 'monospace',
      fontSize: '16px',
      color: '#ffffff'
    });

    const gameScene = this.scene.get('GameScene');
    gameScene.events.on('updateChunks', this.updateChunks, this);


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

  updateChunks(count) {
    // Right pad with spaces to keep label position stable
    this.chunkText.setText('CHUNK ' + count.toString());
  }
}
