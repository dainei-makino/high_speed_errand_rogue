const VIRTUAL_WIDTH = 480;
const VIRTUAL_HEIGHT = 270;
import { evaporateArea } from './effects.js';
import gameState from './game-state.js';

export default class EndingScene extends Phaser.Scene {
  constructor() {
    super('EndingScene');
    this.message = null;
    this.credit = null;
  }

  create() {
    const { width, height } = this.scale.gameSize;
    this.cameras.main.setViewport(
      (width - VIRTUAL_WIDTH * 2) / 2,
      (height - VIRTUAL_HEIGHT * 2) / 2,
      VIRTUAL_WIDTH * 2,
      VIRTUAL_HEIGHT * 2
    );

    this.mask = this.add
      .rectangle(0, 0, VIRTUAL_WIDTH * 2, VIRTUAL_HEIGHT * 2, 0x000000)
      .setOrigin(0)
      .setAlpha(0);
    this.mask.setDepth(1000);
    this.tweens.add({ targets: this.mask, alpha: 0.6, duration: 1000 });

    const style = { fontFamily: 'monospace', fontSize: '64px', color: '#ffffff' };
    this.message = this.add
      .text(40, VIRTUAL_HEIGHT, 'YOU TOOK A BREATH', style)
      .setOrigin(0, 0.5)
      .setDepth(1001);

    const gameScene = this.scene.get('GameScene');
    if (gameScene && gameScene.cameraManager) {
      // Gradually zoom out over the entire ending sequence.
      // The GameScene is paused, so create the tween on this scene
      // and manually update the camera manager's default zoom.
      gameScene.cameraManager.defaultZoom = 0.6;
      this.tweens.add({
        targets: gameScene.cameras.main,
        zoom: 0.6,
        duration: 20000,
        ease: 'Sine.easeInOut'
      });
    }

    this.time.delayedCall(10000, () => {
      evaporateArea(
        this,
        this.message.x,
        this.message.y - this.message.height / 2,
        this.message.width,
        this.message.height,
        0xffffff
      );
      this.message.destroy();
      this.showCredit();
    });
  }

  showCredit() {
    const style = { fontFamily: 'monospace', fontSize: '48px', color: '#ffffff' };
    this.credit = this.add
      .text(40, VIRTUAL_HEIGHT, 'DIRECTOR  DAINEI MAKINO', style)
      .setOrigin(0, 0.5)
      .setDepth(1001)
      .setAlpha(0);
    this.tweens.add({ targets: this.credit, alpha: 1, duration: 500 });

    this.time.delayedCall(10000, () => {
      evaporateArea(
        this,
        this.credit.x,
        this.credit.y - this.credit.height / 2,
        this.credit.width,
        this.credit.height,
        0xffffff
      );
      this.credit.destroy();
      this.restartGame();
    });
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
