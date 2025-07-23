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
  Characters.preload(this);
}

function create() {
  this.add.text(240, 40, 'Hello Phaser!', { fontSize: '32px', color: '#ffffff' }).setOrigin(0.5);
  this.hero = Characters.createHero(this);
  this.hero.setPosition(240, 135);
}

function update() {
  // game loop logic
}

const game = new Phaser.Game(config);
window.addEventListener('resize', () => game.scale.refresh());
