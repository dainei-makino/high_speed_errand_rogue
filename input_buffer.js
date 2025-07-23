export default class InputBuffer {
  constructor(scene) {
    this.scene = scene;
    this.buffer = [];
    this.holdKeys = {};
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
      this.push(dir);
    }
  }

  onKeyUp(event) {
    const dir = this.keyToDir(event.code);
    if (!dir) return;
    delete this.holdKeys[dir];
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

  _isOpposite(a, b) {
    return (
      (a === 'left' && b === 'right') ||
      (a === 'right' && b === 'left') ||
      (a === 'up' && b === 'down') ||
      (a === 'down' && b === 'up')
    );
  }

  consume() {
    const now = this.scene.time.now;
    this._cleanup(now);
    if (this.buffer.length >= 2) {
      const first = this.buffer[0];
      const second = this.buffer[1];
      if (second.time - first.time <= 200 && this._isOpposite(first.dir, second.dir)) {
        this.buffer.splice(0, 2);
        return { dir: second.dir, time: second.time, reversedFrom: first.dir };
      }
    }
    return this.buffer.shift();
  }

  repeat(dir) {
    if (this.holdKeys[dir]) {
      this.push(dir);
    }
  }
}
