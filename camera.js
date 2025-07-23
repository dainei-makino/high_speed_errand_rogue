export default class CameraController {
  constructor(scene) {
    this.scene = scene;
    this.camera = scene.cameras.main;
  }

  follow(target) {
    if (target) {
      this.camera.startFollow(target, true, 0.1, 0.1);
    } else {
      this.camera.stopFollow();
    }
  }

  panTo(x, y, duration = 500) {
    this.camera.pan(x, y, duration, 'Sine.easeInOut');
  }

  setZoom(zoom, duration = 0) {
    if (duration > 0) {
      this.scene.tweens.add({
        targets: this.camera,
        zoom,
        duration,
        ease: 'Sine.easeInOut'
      });
    } else {
      this.camera.setZoom(zoom);
    }
  }
}
