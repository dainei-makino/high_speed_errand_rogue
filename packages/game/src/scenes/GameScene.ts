import Phaser from 'phaser';

export class GameScene extends Phaser.Scene {
  constructor() { super('GameScene'); }

  preload() {
    // preload assets (placeholder)
  }

  create() {
    // temporary text to verify rendering
    this.add.text(400, 300, 'Hello Rogue!', { color: '#ffffff' }).setOrigin(0.5);
  }
}
