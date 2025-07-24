const ASSET_PATH = 'assets/images/';
const SPRITES = {
  floor: 'floor.svg',
  wall: 'wall.svg',
  exit: 'door_closed.svg',
  door_silver: 'door_silver.svg',
  door_silver_open: 'door_silver_open.svg',
  door_open: 'door_open.svg',
  treasure: 'treasure.svg',
  hero: 'hero.svg',
  arrow: 'arrow.svg',
  key: 'key.svg'
};

const canvases = {};

async function loadAll() {
  const entries = Object.entries(SPRITES).map(async ([key, file]) => {
    const svgText = await fetch(ASSET_PATH + file).then(r => r.text());
    const img = new Image();
    const loaded = new Promise(resolve => {
      img.onload = resolve;
      img.onerror = resolve;
    });
    img.src = 'data:image/svg+xml;base64,' + btoa(svgText);
    await loaded;
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);
    canvases[key] = canvas;
  });
  await Promise.all(entries);
}

const ready = loadAll();

function registerTextures(scene) {
  for (const key in canvases) {
    if (!scene.textures.exists(key)) {
      scene.textures.addCanvas(key, canvases[key]);
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

function createSilverDoor(scene) {
  return scene.add.image(0, 0, 'door_silver').setOrigin(0);
}

function createSilverDoorOpen(scene) {
  return scene.add.image(0, 0, 'door_silver_open').setOrigin(0);
}

function createDoorOpen(scene) {
  return scene.add.image(0, 0, 'door_open').setOrigin(0);
}

function createTreasure(scene) {
  return scene.add.image(0, 0, 'treasure').setOrigin(0);
}

function createKey(scene) {
  return scene.add.image(0, 0, 'key').setOrigin(0);
}

function createHero(scene) {
  return scene.add.image(0, 0, 'hero').setOrigin(0.5);
}

function createArrow(scene) {
  return scene.add.image(0, 0, 'arrow').setOrigin(0.5);
}

export default {
  ready,
  registerTextures,
  createFloor,
  createWall,
  createExit,
  createSilverDoor,
  createSilverDoorOpen,
  createDoorOpen,
  createTreasure,
  createKey,
  createHero,
  createArrow
};
