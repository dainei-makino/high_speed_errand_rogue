export default class HeroState {
  constructor() {
    this.health = 3; // プレイヤーの残りHP
    this.speed = 200; // 移動速度(px/s)
    this.position = { x: 0, y: 0 };
    this.inventory = [];
    this.powerUps = [];
  }

  moveTo(x, y) {
    this.position.x = x;
    this.position.y = y;
  }

  takeDamage(amount = 1) {
    this.health = Math.max(this.health - amount, 0);
  }

  addItem(item) {
    this.inventory.push(item);
  }

  addPowerUp(powerUp) {
    this.powerUps.push(powerUp);
  }
}
