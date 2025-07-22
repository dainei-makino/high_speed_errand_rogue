import Phaser from 'phaser';
import { GameScene } from './scenes/GameScene';

export function bootGame(parent: HTMLElement) {
  new Phaser.Game({
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    parent,
    backgroundColor: '#000000',
    scene: [GameScene],
    pixelArt: true
  });
}
