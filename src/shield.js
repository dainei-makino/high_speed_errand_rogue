export default class Shield {
  constructor(scene, mazeManager) {
    this.scene = scene;
    this.mazeManager = mazeManager;
    this.radius = 10;
    this.arc = scene.add.circle(0, 0, this.radius, 0x3388ff, 0);
    this.arc.setDepth(8);
    this.arc.setScrollFactor(0);
  }

  getCurrentChunk() {
    if (!this.mazeManager.activeChunks.length) return null;
    return this.mazeManager.activeChunks[this.mazeManager.activeChunks.length - 1];
  }

  update() {
    const info = this.getCurrentChunk();
    if (!info) return;
    const size = info.chunk.size * this.mazeManager.tileSize;
    const r = (size * 1.3) / 2;
    if (r !== this.radius) {
      this.radius = r;
      this.arc.setRadius(this.radius);
    }
    const { x, y } = this.mazeManager.getChunkCenter(info);
    const cam = this.scene.cameras.main;
    this.arc.setPosition(x - cam.scrollX, y - cam.scrollY);
  }

  getScreenPosition() {
    return { x: this.arc.x, y: this.arc.y };
  }

  flash() {
    this.arc.setFillStyle(0x3388ff, 0.5);
    this.scene.tweens.add({
      targets: this.arc,
      fillAlpha: 0,
      duration: 300
    });
  }
}
