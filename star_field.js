export default class StarField {
  constructor(scene, bounds, count = 300) {
    this.scene = scene;
    this.container = scene.add.container(0, 0);
    this.container.setDepth(-1000);
    const b = bounds || { minX: -1000, minY: -1000, maxX: 9000, maxY: 9000 };
    for (let i = 0; i < count; i++) {
      const x = Phaser.Math.Between(b.minX, b.maxX);
      const y = Phaser.Math.Between(b.minY, b.maxY);
      const star = scene.add.rectangle(x, y, 2, 2, 0xffffff);
      this.container.add(star);
      scene.tweens.add({
        targets: star,
        alpha: { from: 0.3, to: 1 },
        duration: Phaser.Math.Between(800, 2000),
        ease: 'Sine.easeInOut',
        yoyo: true,
        repeat: -1,
        delay: Phaser.Math.Between(0, 2000)
      });
    }
  }
}
