import GameScene from './scenes/GameScene.js';
import UIScene from './scenes/UIScene.js';
import Characters from './characters.js';

const config = {
  type: Phaser.AUTO,
  width: 480,
  height: 270,
  parent: 'game-container',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  render: {
    pixelArt: true,
    roundPixels: true
  },
  scene: [GameScene, UIScene]
};

Characters.ready.then(() => {
  const game = new Phaser.Game(config);
  window.addEventListener('resize', () => game.scale.refresh());
});
