const VIRTUAL_WIDTH = 480;
const VIRTUAL_HEIGHT = 270;
import Characters from './characters.js';

export default class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload() {
    const { width, height } = this.scale.gameSize;
    this.cameras.main.setViewport(
      (width - VIRTUAL_WIDTH * 2) / 2,
      (height - VIRTUAL_HEIGHT * 2) / 2,
      VIRTUAL_WIDTH * 2,
      VIRTUAL_HEIGHT * 2
    );
    this.cameras.main.setBackgroundColor('#000000');

    this.add.text(VIRTUAL_WIDTH, VIRTUAL_HEIGHT, 'LOADING...', {
      fontFamily: 'monospace',
      fontSize: '32px',
      color: '#ffffff'
    }).setOrigin(0.5);

    this.scale.on('resize', (gw, gh) => {
      this.cameras.main.setViewport(
        (gw - VIRTUAL_WIDTH * 2) / 2,
        (gh - VIRTUAL_HEIGHT * 2) / 2,
        VIRTUAL_WIDTH * 2,
        VIRTUAL_HEIGHT * 2
      );
    });

    this.load.audio('hero_walk', 'assets/sounds/01_hero_walk.wav');
    this.load.audio('door_open', 'assets/sounds/02_door_open.mp3');
    this.load.audio('chest_open', 'assets/sounds/03_chest_open.wav');
    this.load.audio('chunk_generate_1', 'assets/sounds/04_chunk_generate_1.wav');
    this.load.audio('chunk_generate_2', 'assets/sounds/05_chunk_generate_02.wav');
    this.load.audio('midpoint', 'assets/sounds/06_midpoint.wav');
    this.load.audio('game_over', 'assets/sounds/07_game_over.wav');

    this.load.once('complete', () => {
      Characters.ready.then(() => {
        Characters.registerTextures(this);
        this.scene.start('TitleScene');
      });
    });
  }
}
