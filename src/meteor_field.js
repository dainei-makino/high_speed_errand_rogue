export default class MeteorField {
  constructor(scene, shield) {
    this.scene = scene;
    this.shield = shield;
    this.container = scene.add.container(0, 0);
    this.container.setDepth(-900);
    this.container.setScrollFactor(0);
    this.active = [];
    this.spawnTimer = scene.time.addEvent({
      delay: Phaser.Math.Between(5000, 10000),
      loop: true,
      callback: () => {
        this.spawnMeteor();
        this.spawnTimer.delay = Phaser.Math.Between(5000, 10000);
      }
    });
  }

  getEdgePos(edge, width, height, margin) {
    switch (edge) {
      case 'left':
        return { x: -margin, y: Phaser.Math.Between(0, height) };
      case 'right':
        return { x: width + margin, y: Phaser.Math.Between(0, height) };
      case 'top':
        return { x: Phaser.Math.Between(0, width), y: -margin };
      case 'bottom':
      default:
        return { x: Phaser.Math.Between(0, width), y: height + margin };
    }
  }

  spawnMeteor() {
    const cam = this.scene.cameras.main;
    const width = cam.width;
    const height = cam.height;
    const margin = 32;
    const edges = ['left', 'right', 'top', 'bottom'];
    const startEdge = Phaser.Utils.Array.GetRandom(edges);
    const opposite = { left: 'right', right: 'left', top: 'bottom', bottom: 'top' };
    const destEdge = opposite[startEdge];
    const start = this.getEdgePos(startEdge, width, height, margin);
    const dest = this.getEdgePos(destEdge, width, height, margin);
    const meteor = this.scene.add.image(start.x, start.y, 'meteor').setOrigin(0.5);
    this.container.add(meteor);
    this.active.push(meteor);
    const distance = Phaser.Math.Distance.Between(start.x, start.y, dest.x, dest.y);
    const speed = 80;
    const duration = (distance / speed) * 1000;
    const rotSpeed = Phaser.Math.FloatBetween(-90, 90);
    this.scene.tweens.add({
      targets: meteor,
      x: dest.x,
      y: dest.y,
      angle: rotSpeed * duration / 1000,
      duration,
      ease: 'Linear',
      onComplete: () => this.removeMeteor(meteor)
    });
  }

  removeMeteor(m) {
    const idx = this.active.indexOf(m);
    if (idx !== -1) this.active.splice(idx, 1);
    m.destroy();
  }

  showExplosion(x, y) {
    const img = this.scene.add.image(x, y, 'meteor_explosion1').setOrigin(0.5);
    img.setDepth(-850);
    img.setScrollFactor(0);
    this.container.add(img);
    this.scene.time.delayedCall(100, () => img.setTexture('meteor_explosion2'));
    this.scene.time.delayedCall(200, () => img.setTexture('meteor_explosion3'));
    this.scene.time.delayedCall(300, () => img.destroy());
  }

  update() {
    const shieldPos = this.shield.getScreenPosition();
    const r2 = this.shield.radius * this.shield.radius;
    for (const m of [...this.active]) {
      const dx = m.x - shieldPos.x;
      const dy = m.y - shieldPos.y;
      if (dx * dx + dy * dy <= r2) {
        this.showExplosion(m.x, m.y);
        this.shield.flash();
        this.removeMeteor(m);
      }
    }
  }

  destroy() {
    if (this.spawnTimer) this.spawnTimer.remove();
    this.active.forEach(m => m.destroy());
    this.container.destroy();
  }
}
