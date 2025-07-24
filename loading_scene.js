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

    // Progress indicator below the label
    this.progressText = this.add.text(VIRTUAL_WIDTH, VIRTUAL_HEIGHT + 32, '0%', {
      fontFamily: 'monospace',
      fontSize: '20px',
      color: '#ffffff'
    }).setOrigin(0.5);
    this.progressText.setDepth(1001);

    // Update progress as assets load
    this.load.on('progress', value => {
      this.progressText.setText(Math.floor(value * 100) + '%');
    });

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
    const startGame = () => {
      // Launch the main scenes behind the loading overlay
      this.scene.launch('GameScene');
      this.scene.launch('UIScene');
      this.scene.bringToTop();

      // Short delay to ensure GameScene is ready before removing overlay
      this.time.delayedCall(200, () => {
        // Evaporate loading text
        // Remove loading texts with a small evaporate effect
        evaporateArea(
          this,
          this.loadingText.x - this.loadingText.width / 2,
        this.loadingText.y - this.loadingText.height / 2,
        this.loadingText.width,
        this.loadingText.height,
        0xffffff
      );
      this.loadingText.destroy();
      evaporateArea(
        this,
        this.progressText.x - this.progressText.width / 2,
        this.progressText.y - this.progressText.height / 2,
        this.progressText.width,
        this.progressText.height,
        0xffffff
      );
      this.progressText.destroy();

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
    };

    const audioKeys = [
      'hero_walk',
      'door_open',
      'chest_open',
      'chunk_generate_1',
      'chunk_generate_2',
      'midpoint',
      'game_over'
    ];

    let decodedCount = 0;
    const onDecoded = key => {
      if (audioKeys.includes(key)) {
        decodedCount++;
        if (decodedCount === audioKeys.length) {
          this.sound.off('decoded', onDecoded);
          startGame();
        }
      }
    };

    this.sound.on('decoded', onDecoded);

    // Decode each audio asset before starting the game
    audioKeys.forEach(key => {
      const audioData = this.cache.audio.get(key);
      if (audioData && audioData.data) {
        this.sound.decodeAudio(key, audioData.data);
      }
    });
  }
}
