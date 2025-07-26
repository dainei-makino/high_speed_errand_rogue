import { isHorizontal, isVertical } from './utils.js';

export default class InputBuffer {
  constructor(scene) {
    this.scene = scene;
    this.buffer = [];
    this.holdKeys = {};
    this.holdOrder = [];
    this.maxSize = 4;
    scene.input.keyboard.on('keydown', this.onKeyDown, this);
    scene.input.keyboard.on('keyup', this.onKeyUp, this);
  }

  keyToDir(code) {
    switch (code) {
      case 'ArrowUp':
      case 'KeyW':
        return 'up';
      case 'ArrowDown':
      case 'KeyS':
        return 'down';
      case 'ArrowLeft':
      case 'KeyA':
        return 'left';
      case 'ArrowRight':
      case 'KeyD':
        return 'right';
      default:
        return null;
    }
  }

  onKeyDown(event) {
    const dir = this.keyToDir(event.code);
    if (!dir) return;
    if (!this.holdKeys[dir]) {
      this.holdKeys[dir] = true;
      this.holdOrder.push(dir);
      if (this.holdOrder.length === 1) {
        this.push(dir);
      } else {
        const first = this.holdOrder[0];
        if ((isHorizontal(first) && isVertical(dir)) || (isVertical(first) && isHorizontal(dir))) {
          this.push(dir);
        }
      }
    }
  }

  onKeyUp(event) {
    const dir = this.keyToDir(event.code);
    if (!dir) return;
    if (this.holdKeys[dir]) {
      delete this.holdKeys[dir];
      const index = this.holdOrder.indexOf(dir);
      if (index !== -1) {
        this.holdOrder.splice(index, 1);
        if (this.holdOrder.length > 0) {
          this.push(this.holdOrder[0]);
        }
      }
    }
  }

  push(dir) {
    const now = this.scene.time.now;
    this._cleanup(now);
    if (this.buffer.length < this.maxSize) {
      this.buffer.push({ dir, time: now });
    }
  }

  _cleanup(now) {
    while (this.buffer.length && now - this.buffer[0].time > 200) {
      this.buffer.shift();
    }
  }

  consume() {
    const now = this.scene.time.now;
    this._cleanup(now);
    return this.buffer.shift();
  }

  repeat(dir) {
    if (this.holdOrder.includes(dir)) {
      let alt = null;
      for (const d of this.holdOrder) {
        if (d !== dir && ((isHorizontal(d) && isVertical(dir)) || (isVertical(d) && isHorizontal(dir)))) {
          alt = d;
          break;
        }
      }
      this.push(alt || dir);
    }
  }

  promote(dir) {
    const index = this.holdOrder.indexOf(dir);
    if (index > 0) {
      this.holdOrder.splice(index, 1);
      this.holdOrder.unshift(dir);
    }
  }

  reset() {
    this.buffer.length = 0;
    this.holdOrder.length = 0;
    this.holdKeys = {};
  }
}
