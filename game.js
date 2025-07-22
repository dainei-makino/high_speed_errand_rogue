const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
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
  this.add.text(300, 280, 'Hello Phaser!', { fontSize: '32px', color: '#ffffff' }).setOrigin(0.5);
}

function update() {
  // game loop logic
}

new Phaser.Game(config);
