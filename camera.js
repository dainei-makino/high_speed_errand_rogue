(function(global){
  class GameCamera {
    constructor(phaserCamera) {
      this.camera = phaserCamera;
    }

    follow(target) {
      if (target) {
        this.camera.startFollow(target);
      } else {
        this.camera.stopFollow();
      }
    }

    moveTo(x, y) {
      this.camera.centerOn(x, y);
    }
  }

  global.GameCamera = GameCamera;
})(typeof window !== 'undefined' ? window : global);
