const VIRTUAL_WIDTH = 480;
const VIRTUAL_HEIGHT = 270;

export default class TitleScene extends Phaser.Scene {
  constructor() {
    super('TitleScene');
  }

  create() {
    const { width, height } = this.scale.gameSize;
    this.cameras.main.setViewport(
      (width - VIRTUAL_WIDTH * 2) / 2,
      (height - VIRTUAL_HEIGHT * 2) / 2,
      VIRTUAL_WIDTH * 2,
      VIRTUAL_HEIGHT * 2
    );
    // Transparent background so the initial maze and hero from GameScene are visible
    this.cameras.main.setBackgroundColor(null);

    this.scene.launch('GameScene');
    const gs = this.scene.get('GameScene');
    gs.events.once('create', () => {
      this.scene.pause('GameScene');
      this.scene.sendToBack('GameScene');
    });

    this.add.text(VIRTUAL_WIDTH, 40, 'HIGH SPEED MAZE RUNNER', {
      fontFamily: 'monospace',
      fontSize: '32px',
      color: '#ffffff'
    }).setOrigin(0.5, 0);

    this.add.text(VIRTUAL_WIDTH, VIRTUAL_HEIGHT * 2 - 40, 'MOVE TO W/A/S/D KEY', {
      fontFamily: 'monospace',
      fontSize: '24px',
      color: '#ffffff'
    }).setOrigin(0.5);

    this.startHandler = event => {
      const code = event.code;
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyW', 'KeyA', 'KeyS', 'KeyD'].includes(code)) {
        this.input.keyboard.off('keydown', this.startHandler);
        this.scene.resume('GameScene');
        this.scene.launch('UIScene');
        this.scene.stop();
      }
    };
    this.input.keyboard.on('keydown', this.startHandler);
  }
}
