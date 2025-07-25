export default class Shield {
  constructor(scene) {
    this.scene = scene;
    // Fixed ellipse 240px wide by 200px tall
    this.radiusX = 120;
    this.radiusY = 100;
    this.sprite = scene
      .add
      .image(0, 0, this._createTexture(this.radiusX, this.radiusY))
      .setOrigin(0.5);
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

  _createTexture(rx, ry) {
    const width = Math.ceil(rx * 2) + 2;
    const height = Math.ceil(ry * 2) + 2;
    const key = `shield-${Math.floor(rx)}x${Math.floor(ry)}`;
    if (this.scene.textures.exists(key)) {
      this.scene.textures.remove(key);
    }
    const tex = this.scene.textures.createCanvas(key, width, height);
    const ctx = tex.context;
    ctx.clearRect(0, 0, width, height);
    ctx.save();
    ctx.translate(width / 2, height / 2);
    const scaleY = ry / rx;
    ctx.scale(1, scaleY);
    const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
    grad.addColorStop(0, 'rgba(51,136,255,0)');
    grad.addColorStop(1, 'rgba(51,136,255,0.6)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, rx, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 1 / scaleY;
    ctx.strokeStyle = 'rgba(102,170,255,0.8)';
    ctx.beginPath();
    ctx.arc(0, 0, rx - 0.5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    tex.refresh();
    return key;
  }
}
