export default class HeroState {
  constructor() {
    this.health = 3; // プレイヤーの残りHP
    // Base movement speed in pixels per second.
    // This value now directly controls move tween duration.
    this.speed = 200;
    this.position = { x: 0, y: 0 };
    this.inventory = [];
    this.powerUps = [];
    this.keys = 0;
    this.maxOxygen = 20;
    this.oxygen = 20;
    this.direction = 'down';
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
