export function newChunkTransition(scene, doorDir, doorWorldX, doorWorldY) {
  const size = scene.mazeManager.tileSize;
  const screenW = scene.cameras.main.width;
  const screenH = scene.cameras.main.height;
  const crossLength = Math.max(screenW, screenH) * 1.5;
  const planeLength = Math.max(screenW, screenH) * 2;
  const vertical = doorDir === 'E' || doorDir === 'W';
  const thickness = size * 1.5;
  const rect = scene.add.rectangle(
    doorWorldX + size / 2,
    doorWorldY + size / 2,
    vertical ? thickness : crossLength,
    vertical ? crossLength : thickness,
    0xffffff
  );
  rect.setOrigin(0.5);
  rect.setDepth(1000);
  scene.worldLayer.add(rect);

  if (vertical) {
    rect.scaleY = 0;
    scene.tweens.add({
      targets: rect,
      scaleY: 1,
      duration: 100,
      onComplete: () => {
        rect.fillAlpha = 0.5;
        scene.tweens.add({
          targets: rect,
          x: rect.x + (doorDir === 'E' ? planeLength : -planeLength),
          displayWidth: crossLength,
          duration: 300,
          ease: 'Sine.easeIn',
          onComplete: () => rect.destroy()
        });
      }
    });
  } else {
    rect.scaleX = 0;
    scene.tweens.add({
      targets: rect,
      scaleX: 1,
      duration: 100,
      onComplete: () => {
        rect.fillAlpha = 0.5;
        scene.tweens.add({
          targets: rect,
          y: rect.y + (doorDir === 'S' ? planeLength : -planeLength),
          displayHeight: crossLength,
          duration: 300,
          ease: 'Sine.easeIn',
          onComplete: () => rect.destroy()
        });
      }
    });
  }
}

export function evaporateChunk(scene, x, y, width, height) {
  if (!scene.textures.exists('particle')) {
    const g = scene.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0xffffff, 1);
    g.fillRect(0, 0, 4, 4);
    g.generateTexture('particle', 4, 4);
    g.destroy();
  }
  const particles = scene.add.particles('particle');
  particles.setDepth(1000);
  const emitter = particles.addEmitter({
    x: { min: x, max: x + width },
    y: { min: y, max: y + height },
    speedX: { min: -20, max: 20 },
    speedY: { min: -60, max: -30 },
    alpha: { start: 0.7, end: 0 },
    scale: { start: 1, end: 0 },
    lifespan: 600,
    tint: 0x000000,
    quantity: 20
  });
  emitter.explode(40, width / 2 + x, height / 2 + y);
  scene.time.delayedCall(600, () => particles.destroy());
}
