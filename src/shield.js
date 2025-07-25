export default class Shield {
  constructor(scene) {
    this.scene = scene;
    // Fixed diameter of 180px regardless of zoom or chunk size
    this.radius = 90;
    this.sprite = scene.add.image(0, 0, this._createTexture(this.radius)).setOrigin(0.5);
    this.sprite.setDepth(8);
    this.sprite.setScrollFactor(0);
    this.sprite.setAlpha(0);
    this.updatePosition();
  }

  updatePosition() {
    const cam = this.scene.cameras.main;
    this.sprite.setPosition(cam.centerX, cam.centerY);
  }

  update() {
    this.updatePosition();
  }

  getWorldPosition() {
    const cam = this.scene.cameras.main;
    return { x: cam.scrollX + cam.centerX, y: cam.scrollY + cam.centerY };
  }

  flash() {
    this.sprite.setAlpha(1);
    this.scene.tweens.add({
      targets: this.sprite,
      alpha: 0,
      duration: 300
    });
  }

  _createTexture(radius) {
    const size = Math.ceil(radius * 2) + 2;
    const key = `shield-${Math.floor(radius)}`;
    if (this.scene.textures.exists(key)) {
      this.scene.textures.remove(key);
    }
    const tex = this.scene.textures.createCanvas(key, size, size);
    const ctx = tex.context;
    ctx.clearRect(0, 0, size, size);
    const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, radius);
    grad.addColorStop(0, 'rgba(51,136,255,0)');
    grad.addColorStop(1, 'rgba(51,136,255,0.6)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(102,170,255,0.8)';
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, radius - 0.5, 0, Math.PI * 2);
    ctx.stroke();
    tex.refresh();
    return key;
  }
}
