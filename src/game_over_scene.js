const VIRTUAL_WIDTH = 480;
const VIRTUAL_HEIGHT = 270;
import gameState from './game-state.js';

export default class GameOverScene extends Phaser.Scene {
  constructor() {
    super('GameOverScene');
  }

  create() {
    const { width, height } = this.scale.gameSize;
    this.cameras.main.setViewport(
      (width - VIRTUAL_WIDTH * 2) / 2,
      (height - VIRTUAL_HEIGHT * 2) / 2,
      VIRTUAL_WIDTH * 2,
      VIRTUAL_HEIGHT * 2
    );

    this.mask = this.add.rectangle(0, 0, VIRTUAL_WIDTH * 2, VIRTUAL_HEIGHT * 2, 0x000000)
      .setOrigin(0)
      .setAlpha(0);
    this.tweens.add({ targets: this.mask, alpha: 0.6, duration: 500 });

    this.letters = this.createFloatingText('RETRY?', VIRTUAL_WIDTH, VIRTUAL_HEIGHT);

    this.input.keyboard.once('keydown-W', () => this.restartGame());
    this.input.keyboard.once('keydown-A', () => this.restartGame());
    this.input.keyboard.once('keydown-S', () => this.restartGame());
    this.input.keyboard.once('keydown-D', () => this.restartGame());
  }

  createFloatingText(str, centerX, y) {
    const style = { fontFamily: 'monospace', fontSize: '48px', color: '#ffffff' };
    const measure = this.add.text(0, 0, str, style).setOrigin(0.5);
    const total = measure.width;
    measure.destroy();
    let x = centerX - total / 2;
    const letters = [];
    for (const ch of str) {
      const letter = this.add.text(0, 0, ch, style).setOrigin(0.5);
      letter.x = x + letter.width / 2;
      letter.y = y;
      letter.setDepth(1001);
      this.tweens.add({
        targets: letter,
        y: letter.y + Phaser.Math.Between(-6, 6),
        duration: 800 + Phaser.Math.Between(0, 400),
        repeat: -1,
        yoyo: true,
        ease: 'Sine.easeInOut',
        delay: Phaser.Math.Between(0, 300)
      });
      letters.push(letter);
      x += letter.width;
    }
    return letters;
  }

  restartGame() {
    this.scene.stop('GameScene');
    this.scene.stop('UIScene');
    gameState.reset();
    this.scene.start('GameScene');
    this.scene.launch('UIScene');
    this.scene.bringToTop('UIScene');
    this.scene.stop();
  }
}
