(function(global){
  class GameRenderer {
    constructor(scene) {
      this.scene = scene;
    }

    preload() {
      // preload assets for rendering here
    }

    create() {
      // simple placeholder to show separation of rendering
      this.text = this.scene.add.text(
        240,
        135,
        'Hello Phaser!',
        { fontSize: '32px', color: '#ffffff' }
      ).setOrigin(0.5);
    }

    update(time, delta) {
      // future game rendering updates go here
    }
  }

  global.GameRenderer = GameRenderer;
})(typeof window !== 'undefined' ? window : global);
