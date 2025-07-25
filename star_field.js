export default class StarField {
  constructor(scene, count = 200) {
    this.scene = scene;
    const cam = scene.cameras.main;
    const width = cam.width;
    const height = cam.height;
    this.container = scene.add.container(0, 0);
    this.container.setDepth(-1000);
    this.container.setScrollFactor(0);
    for (let i = 0; i < count; i++) {
      const x = Phaser.Math.Between(0, width);
      const y = Phaser.Math.Between(0, height);
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
