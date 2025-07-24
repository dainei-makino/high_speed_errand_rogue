export function playHeroIdle(scene, sprite) {
  scene.tweens.killTweensOf(sprite);
  sprite.setFlipX(sprite.flipX || false);
  sprite.setAngle(0);
  sprite.x = 0;
  sprite.y = 0;
  sprite.scaleY = 1;
  scene.tweens.add({
    targets: sprite,
    scaleY: 1.02,
    y: '+=1',
    yoyo: true,
    duration: 400,
    repeat: -1
  });
}

export function playHeroRun(scene, sprite, direction) {
  scene.tweens.killTweensOf(sprite);
  sprite.setAngle(0);
  if (direction === 'left') {
    sprite.setFlipX(true);
  } else if (direction === 'right') {
    sprite.setFlipX(false);
  }
  sprite.x = 0;
  sprite.y = 0;
  scene.tweens.add({
    targets: sprite,
    x: '+=1',
    yoyo: true,
    duration: 60,
    repeat: -1
  });
}
