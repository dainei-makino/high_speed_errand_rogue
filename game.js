// Global state for tracking overall game progress
const gameState = new GameState();

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
  Characters.registerTextures(this);
}

let hero;

function create() {
  this.add.text(240, 40, 'Hello Phaser!', { fontSize: '32px', color: '#ffffff' }).setOrigin(0.5);
  this.hero = Characters.createHero(this);
  this.hero.setPosition(240, 135);
  hero = new HeroState();
  this.add.text(240, 135, 'Hello Phaser!', { fontSize: '32px', color: '#ffffff' }).setOrigin(0.5);
  this.mazeText = this.add.text(10, 10, `Mazes Cleared: ${gameState.clearedMazes}`, {
    fontSize: '16px',
    color: '#ffffff'
  });

  this.input.keyboard.on('keydown-M', () => {
    gameState.incrementMazeCount();
    this.mazeText.setText(`Mazes Cleared: ${gameState.clearedMazes}`);
  });
}

function update() {
  // game loop logic
}

Characters.ready.then(() => {
  const game = new Phaser.Game(config);
  window.addEventListener('resize', () => game.scale.refresh());
});
