export default class HeroState {
  constructor() {
    this.health = 3; // プレイヤーの残りHP
    // Base movement speed in pixels per second
    // Reduced to half of the previously boosted value
    this.speed = 500;
    this.position = { x: 0, y: 0 };
    this.inventory = [];
    this.powerUps = [];
    this.keys = 0;
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

  addKey() {
    this.keys += 1;
  }

  useKey() {
    if (this.keys > 0) {
      this.keys -= 1;
      return true;
    }
    return false;
  }

  addPowerUp(powerUp) {
    this.powerUps.push(powerUp);
  }
}
