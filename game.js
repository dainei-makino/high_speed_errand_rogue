const config = {
  type: Phaser.AUTO,
  width: 480,
  height: 270,
  parent: 'game-container',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 480,
    height: 270
  },
  scene: {
    preload,
    create,
    update
  }
};

function preload() {
  // preload assets here (none for minimal setup)
}

function create() {
  this.add.text(240, 135, 'Hello Phaser!', { fontSize: '32px', color: '#ffffff' }).setOrigin(0.5);
}

function update() {
  // game loop logic
}

const game = new Phaser.Game(config);
window.addEventListener('resize', () => game.scale.refresh());
