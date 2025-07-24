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
