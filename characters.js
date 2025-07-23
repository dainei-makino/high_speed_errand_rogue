(function() {
  const TILE_SIZE = 32;
  const ASSET_PATH = 'assets/';
  const SPRITES = {
    floor: 'floor.svg',
    wall: 'wall.svg',
    exit: 'exit.svg',
    treasure: 'treasure.svg',
    hero: 'hero.svg'
  };

  function preload(scene) {
    for (const [key, file] of Object.entries(SPRITES)) {
      if (!scene.textures.exists(key)) {
        scene.load.svg(key, ASSET_PATH + file, { width: TILE_SIZE, height: TILE_SIZE });
      }
    }
  }

  function createFloor(scene) {
    return scene.add.image(0, 0, 'floor').setOrigin(0);
  }

  function createWall(scene) {
    return scene.add.image(0, 0, 'wall').setOrigin(0);
  }

  function createExit(scene) {
    return scene.add.image(0, 0, 'exit').setOrigin(0);
  }

  function createTreasure(scene) {
    return scene.add.image(0, 0, 'treasure').setOrigin(0);
  }

  function createHero(scene) {
    return scene.add.image(0, 0, 'hero').setOrigin(0.5);
  }

  window.Characters = {
    preload,
    createFloor,
    createWall,
    createExit,
    createTreasure,
    createHero
  };
})();
