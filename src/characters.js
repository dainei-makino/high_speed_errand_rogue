const ASSET_PATH = 'assets/images/';
const SPRITES = {
  floor: 'floor.svg',
  wall: 'wall.svg',
  exit: 'airlock_closed.svg',
  door_silver: 'airlock_silver.svg',
  door_silver_open: 'airlock_silver_open.svg',
  auto_gate_open: 'auto_gate_open.svg',
  auto_gate_closed: 'auto_gate_closed.svg',
  door_open: 'airlock_open.svg',
  reactor_core: 'core_reactor.svg',
  treasure: 'treasure.svg',
  sleep_pod: 'sleep_pod.svg',
  sleep_pod_broken: 'sleep_pod_broken.svg',
  sleep_pod_with_hero: 'sleep_pod_with_hero.svg',
  hero_plain: 'hero_plain.svg',
  hero_idle: 'hero.svg',
  hero_walk1: 'hero_walk1.svg',
  hero_walk2: 'hero_walk2.svg',
  hero_walk3: 'hero_walk3.svg',
  hero_back_walk1: 'hero_back_walk1.svg',
  hero_back_walk2: 'hero_back_walk2.svg',
  hero_back_walk3: 'hero_back_walk3.svg',
  hero_right_walk1: 'hero_right_walk1.svg',
  hero_right_walk2: 'hero_right_walk2.svg',
  hero_right_walk3: 'hero_right_walk3.svg',
  rival_walk1: 'rival_walk1.svg',
  rival_walk2: 'rival_walk2.svg',
  rival_walk3: 'rival_walk3.svg',
  rival_back_walk1: 'rival_back_walk1.svg',
  rival_back_walk2: 'rival_back_walk2.svg',
  rival_back_walk3: 'rival_back_walk3.svg',
  rival_right_walk1: 'rival_right_walk1.svg',
  rival_right_walk2: 'rival_right_walk2.svg',
  rival_right_walk3: 'rival_right_walk3.svg',
  arrow: 'arrow.svg',
  key: 'key.svg',
  air_tank: 'air_tank.svg',
  air_tank_dark: 'air_tank_dark.svg',
  oxygen_console: 'oxygen_supply_console.svg',
  spikes: 'floor_spikes.svg',
  electric_machine: 'electric_machine.svg',
  meteor: 'meteor.svg',
  meteor_explosion1: 'meteor_explosion1.svg',
  meteor_explosion2: 'meteor_explosion2.svg',
  meteor_explosion3: 'meteor_explosion3.svg',
  wall_corner: 'wall_corner.svg',
  wall_end: 'wall_end.svg',
  floor_crack1: 'floor_crack1.svg',
  floor_crack2: 'floor_crack2.svg',
  floor_dirt1: 'floor_dirt1.svg',
  floor_dirt2: 'floor_dirt2.svg',
  floor_scratch1: 'floor_scratch1.svg',
  floor_scratch2: 'floor_scratch2.svg',
  item_switch: 'floor_switch_red.svg',
  hero_spacesuit: 'hero_spacesuit.svg',
  monitor_computer: 'monitor_computer.svg',
  monitor_display: 'monitor_display.svg'
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
    // btoa only supports Latin1; handle UTF-8 characters like O₂
    const encoded = btoa(unescape(encodeURIComponent(svgText)));
    img.src = 'data:image/svg+xml;base64,' + encoded;
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

function createWallCorner(scene) {
  // Rotating this tile requires its origin to be centered
  return scene.add.image(0, 0, 'wall_corner').setOrigin(0.5);
}

function createWallEnd(scene) {
  // Similar to wall_corner but with two rounded corners
  return scene.add.image(0, 0, 'wall_end').setOrigin(0.5);
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

function createAutoGateOpen(scene) {
  return scene.add.image(0, 0, 'auto_gate_open').setOrigin(0);
}

function createAutoGateClosed(scene) {
  return scene.add.image(0, 0, 'auto_gate_closed').setOrigin(0);
}

function createReactorCore(scene) {
  return scene.add.image(0, 0, 'reactor_core').setOrigin(0.5);
}

function createDoorOpen(scene) {
  return scene.add.image(0, 0, 'door_open').setOrigin(0);
}

function createFloorDecal(scene, key) {
  return scene.add.image(0, 0, key).setOrigin(0.5);
}

function createTreasure(scene) {
  return scene.add.image(0, 0, 'treasure').setOrigin(0);
}

function createKey(scene) {
  return scene.add.image(0, 0, 'key').setOrigin(0);
}

function createAirTank(scene) {
  return scene.add.image(0, 0, 'air_tank').setOrigin(0);
}

function createAirTankDark(scene) {
  return scene.add.image(0, 0, 'air_tank_dark').setOrigin(0);
}

function createOxygenConsole(scene) {
  return scene.add.image(0, 0, 'oxygen_console').setOrigin(0);
}

function createItemSwitch(scene) {
  return scene.add.image(0, 0, 'item_switch').setOrigin(0);
}

function createSpike(scene) {
  return scene.add.image(0, 0, 'spikes').setOrigin(0);
}

function createElectricMachine(scene) {
  return scene.add.image(0, 0, 'electric_machine').setOrigin(0);
}

function createSleepPod(scene) {
  return scene.add.image(0, 0, 'sleep_pod').setOrigin(0);
}

function createSleepPodBroken(scene) {
  return scene.add.image(0, 0, 'sleep_pod_broken').setOrigin(0);
}

function createSleepPodWithHero(scene) {
  return scene.add.image(0, 0, 'sleep_pod_with_hero').setOrigin(0);
}

function createMeteor(scene) {
  return scene.add.image(0, 0, 'meteor').setOrigin(0.5);
}

function createMeteorExplosion(scene) {
  return scene.add.image(0, 0, 'meteor_explosion1').setOrigin(0.5);
}

function createHero(scene) {
  return scene.add.image(0, 0, 'hero_idle').setOrigin(0.5);
}

function createHeroPlain(scene) {
  return scene.add.image(0, 0, 'hero_plain').setOrigin(0.5);
}

function createRival(scene) {
  return scene.add.image(0, 0, 'rival_walk1').setOrigin(0.5);
}

function createArrow(scene) {
  return scene.add.image(0, 0, 'arrow').setOrigin(0.5);
}

function createHeroSpacesuit(scene) {
  return scene.add.image(0, 0, 'hero_spacesuit').setOrigin(0);
}

function createMonitorComputer(scene) {
  return scene.add.image(0, 0, 'monitor_computer').setOrigin(0);
}

function createMonitorDisplay(scene) {
  return scene.add.image(0, 0, 'monitor_display').setOrigin(0);
}

export default {
  ready,
  registerTextures,
  createFloor,
  createWall,
  createWallCorner,
  createWallEnd,
  createExit,
  createSilverDoor,
  createSilverDoorOpen,
  createAutoGateOpen,
  createAutoGateClosed,
  createDoorOpen,
  createTreasure,
  createKey,
  createAirTank,
  createAirTankDark,
  createOxygenConsole,
  createItemSwitch,
  createSpike,
  createElectricMachine,
  createReactorCore,
  createSleepPod,
  createSleepPodBroken,
  createSleepPodWithHero,
  createMeteor,
  createMeteorExplosion,
  createHero,
  createHeroPlain,
  createRival,
  createHeroSpacesuit,
  createArrow,
  createFloorDecal,
  createMonitorComputer,
  createMonitorDisplay
};
