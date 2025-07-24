// LoadingScene handles initial asset loading and displays a loading overlay.
import Characters from './characters.js';
import { evaporateArea } from './effects.js';

const VIRTUAL_WIDTH = 480;
const VIRTUAL_HEIGHT = 270;

export default class LoadingScene extends Phaser.Scene {
  constructor() {
    super('LoadingScene');
  }

  preload() {
    // Register textures that were preloaded via Characters.ready
    Characters.registerTextures(this);

    // Full screen black mask
    this.mask = this.add.rectangle(0, 0, VIRTUAL_WIDTH * 2, VIRTUAL_HEIGHT * 2, 0x000000)
      .setOrigin(0);
    this.mask.setDepth(1000);

    // "NOW LOADING" label
    this.loadingText = this.add.text(VIRTUAL_WIDTH, VIRTUAL_HEIGHT, 'NOW LOADING', {
      fontFamily: 'monospace',
      fontSize: '32px',
      color: '#ffffff'
    }).setOrigin(0.5);
    this.loadingText.setDepth(1001);

    // Audio assets
    this.load.audio('hero_walk', 'assets/sounds/01_hero_walk.wav');
    this.load.audio('door_open', 'assets/sounds/02_door_open.mp3');
    this.load.audio('chest_open', 'assets/sounds/03_chest_open.wav');
    this.load.audio('chunk_generate_1', 'assets/sounds/04_chunk_generate_1.wav');
    this.load.audio('chunk_generate_2', 'assets/sounds/05_chunk_generate_02.wav');
    this.load.audio('midpoint', 'assets/sounds/06_midpoint.wav');
    this.load.audio('game_over', 'assets/sounds/07_game_over.wav');
  }

  create() {
    // Launch the main scenes behind the loading overlay
    this.scene.launch('GameScene');
    this.scene.launch('UIScene');
    this.scene.bringToTop();

    // Short delay to ensure GameScene is ready before removing overlay
    this.time.delayedCall(200, () => {
      // Evaporate loading text
      evaporateArea(
        this,
        this.loadingText.x - this.loadingText.width / 2,
        this.loadingText.y - this.loadingText.height / 2,
        this.loadingText.width,
        this.loadingText.height,
        0xffffff
      );
      this.loadingText.destroy();

      // Evaporate mask after text
      evaporateArea(this, 0, 0, VIRTUAL_WIDTH * 2, VIRTUAL_HEIGHT * 2, 0x000000);
      this.tweens.add({
        targets: this.mask,
        alpha: 0,
        duration: 500,
        onComplete: () => {
          this.mask.destroy();
          this.scene.stop();
        }
      });
    });
  }
}
