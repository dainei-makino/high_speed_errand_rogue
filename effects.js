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

// チャンク消滅時に黒いチップを飛ばす簡易エフェクト
export function evaporateChunk(scene, x, y, width, height) {
  const PARTICLES = 30;
  const SIZE = 4;
  for (let i = 0; i < PARTICLES; i++) {
    const px = x + Math.random() * width;
    const py = y + Math.random() * height;
    const chip = scene.add.rectangle(px, py, SIZE, SIZE, 0x000000);
    chip.setDepth(1000);
    const dx = (Math.random() - 0.5) * 40;
    const dy = -30 - Math.random() * 30;
    scene.tweens.add({
      targets: chip,
      x: chip.x + dx,
      y: chip.y + dy,
      alpha: 0,
      scale: 0,
      duration: 600,
      ease: 'Quad.easeOut',
      onComplete: () => chip.destroy()
    });
  }
}

// Generic evaporate effect for arbitrary rectangular areas
export function evaporateArea(scene, x, y, width, height, color = 0xffffff) {
  const PARTICLES = 30;
  const SIZE = 4;
  for (let i = 0; i < PARTICLES; i++) {
    const px = x + Math.random() * width;
    const py = y + Math.random() * height;
    const chip = scene.add.rectangle(px, py, SIZE, SIZE, color);
    chip.setDepth(1000);
    const dx = (Math.random() - 0.5) * 40;
    const dy = -30 - Math.random() * 30;
    scene.tweens.add({
      targets: chip,
      x: chip.x + dx,
      y: chip.y + dy,
      alpha: 0,
      scale: 0,
      duration: 600,
      ease: 'Quad.easeOut',
      onComplete: () => chip.destroy()
    });
  }
}
