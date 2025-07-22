import Phaser from 'phaser';

export class MainScene extends Phaser.Scene {
  constructor() {
    super('main');
  }

  create() {
    this.cameras.main.setBackgroundColor('#000000');
  }
}

export function createGame(parent: HTMLElement | string): Phaser.Game {
  return new Phaser.Game({
    type: Phaser.AUTO,
    width: 640,
    height: 360,
    parent,
    scene: MainScene,
  });
}
