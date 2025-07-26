// Maze generation rebuilt from docs/maze_core_core mechanics.md
// Provides deterministic chunk generation using DFS and BFS checks

export class RNG {
  constructor(seed) {
    // simple LCG for deterministic randomness
    this.state = typeof seed === 'number' ? seed >>> 0 : this.hash(seed);
  }

  hash(str) {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  next() {
    this.state = (Math.imul(1664525, this.state) + 1013904223) >>> 0;
    return this.state;
  }

  nextFloat() {
    return this.next() / 0xffffffff;
  }

  nextInt(max) {
    return Math.floor(this.nextFloat() * max);
  }
}

export const TILE = {
  WALL: 0,
  FLOOR: 1,
  CHEST: 2,
  DOOR: 3,
  ITEM_CHEST: 4,
  SPECIAL: 5,
  SILVER_DOOR: 6,
  OXYGEN: 7,
  AUTO_GATE: 8,
  REACTOR: 9
};

const DIRS = [
  { dx: 0, dy: -1, name: 'N' },
  { dx: 1, dy: 0, name: 'E' },
  { dx: 0, dy: 1, name: 'S' },
  { dx: -1, dy: 0, name: 'W' }
];

function index(x, y, size) {
  return y * size + x;
}

export class MazeChunk {
  constructor(seed = 'seed', size = 13, entry = 'W') {
    if (size % 2 === 0) size += 1; // ensure odd size to avoid double walls
    this.size = size;
    this.seed = seed;
    this.entry = entry;
    this.tiles = new Uint8Array(size * size);
    this.door = null;
    this.chest = null;
    this._generate();
  }

  _generate() {
    const rng = new RNG(this.seed);
    const size = this.size;
    const tiles = this.tiles;
    tiles.fill(TILE.WALL);

    const stack = [];
    // ensure starting position is on an odd tile so that the
    // maze paths reach the very first interior row/column
    // (avoids double-thick walls on the north and west edges)
    const maxIdx = Math.floor((size - 1) / 2);
    const startX = rng.nextInt(maxIdx) * 2 + 1;
    const startY = rng.nextInt(maxIdx) * 2 + 1;
    stack.push({ x: startX, y: startY });
    tiles[index(startX, startY, size)] = TILE.FLOOR;

    while (stack.length) {
      const { x, y } = stack[stack.length - 1];
      const neighbors = [];
      for (const dir of DIRS) {
        const nx = x + dir.dx * 2;
        const ny = y + dir.dy * 2;
        if (
          nx > 0 && ny > 0 && nx < size - 1 && ny < size - 1 &&
          tiles[index(nx, ny, size)] === TILE.WALL
        ) {
          neighbors.push({ dir, nx, ny });
        }
      }
      if (neighbors.length) {
        const n = neighbors[rng.nextInt(neighbors.length)];
        tiles[index(x + n.dir.dx, y + n.dir.dy, size)] = TILE.FLOOR;
        tiles[index(n.nx, n.ny, size)] = TILE.FLOOR;
        stack.push({ x: n.nx, y: n.ny });
      } else {
        stack.pop();
      }
    }

    this._placeSpecials(rng);
    this._addDetours(rng);
  }

  _randomFloor(rng) {
    const size = this.size;
    let x, y;
    do {
      x = rng.nextInt(size - 2) + 1;
      y = rng.nextInt(size - 2) + 1;
    } while (this.tiles[index(x, y, size)] !== TILE.FLOOR);
    return { x, y };
  }

  _placeSpecials(rng) {
    const size = this.size;
    const tiles = this.tiles;
    // place chest
    const chest = this._randomFloor(rng);
    this.tiles[index(chest.x, chest.y, size)] = TILE.CHEST;
    this.chest = chest;

    // place door on a side not equal to entry
    const sides = ['N', 'E', 'S', 'W'].filter(s => s !== this.entry);
    const side = sides[rng.nextInt(sides.length)];
    const door = this._doorPosition(side, rng);
    const back = DIRS.find(d => d.name === side);
    // carve a passage leading to the door if necessary
    const ix = door.x - back.dx;
    const iy = door.y - back.dy;
    if (tiles[index(ix, iy, size)] === TILE.WALL) {
      tiles[index(ix, iy, size)] = TILE.FLOOR;
    }
    tiles[index(door.x, door.y, size)] = TILE.DOOR;
    this.door = { dir: side, x: door.x, y: door.y };

    // verify reachability; if not reachable, regenerate with different seed
    if (!this._isReachable(chest, door)) {
      this.seed += '_retry';
      this._generate();
    }
  }

  _addDetours(rng) {
    const size = this.size;
    const tiles = this.tiles;
    const max = Math.max(1, Math.floor(size / 3));
    let count = rng.nextInt(max) + 1;
    if (size >= 13) {
      count += 2;
    } else if (size >= 11) {
      count += 1;
    }
    for (let i = 0; i < count; i++) {
      const x = rng.nextInt(size - 2) + 1;
      const y = rng.nextInt(size - 2) + 1;
      const idx = index(x, y, size);
      if (tiles[idx] === TILE.WALL) {
        tiles[idx] = TILE.FLOOR;
      }
    }
  }

  _doorPosition(side, rng) {
    const size = this.size;
    switch (side) {
      case 'N':
        return { x: rng.nextInt(size - 2) + 1, y: 0 };
      case 'S':
        return { x: rng.nextInt(size - 2) + 1, y: size - 1 };
      case 'W':
        return { x: 0, y: rng.nextInt(size - 2) + 1 };
      case 'E':
      default:
        return { x: size - 1, y: rng.nextInt(size - 2) + 1 };
    }
  }

  _isReachable(start, goal) {
    const size = this.size;
    const tiles = this.tiles;
    const visited = new Uint8Array(size * size);
    const queue = [start];
    visited[index(start.x, start.y, size)] = 1;

    while (queue.length) {
      const { x, y } = queue.shift();
      if (x === goal.x && y === goal.y) return true;
      for (const dir of DIRS) {
        const nx = x + dir.dx;
        const ny = y + dir.dy;
        if (
          nx >= 0 && ny >= 0 && nx < size && ny < size &&
          !visited[index(nx, ny, size)] &&
          tiles[index(nx, ny, size)] !== TILE.WALL
        ) {
          visited[index(nx, ny, size)] = 1;
          queue.push({ x: nx, y: ny });
        }
      }
    }
    return false;
  }
}

export function createChunk(seed, size = 13, entry = 'W') {
  if (size % 2 === 0) size += 1; // enforce odd sizes consistently
  return new MazeChunk(seed, size, entry);
}

export class MazeRectChunk {
  constructor(seed = 'seed', width = 13, height = 13, entry = 'W') {
    if (width % 2 === 0) width += 1;
    if (height % 2 === 0) height += 1;
    this.width = width;
    this.height = height;
    this.seed = seed;
    this.entry = entry;
    this.tiles = new Uint8Array(width * height);
    this.door = null;
    this.chest = null;
    this._generate();
  }

  _generate() {
    const rng = new RNG(this.seed);
    const w = this.width;
    const h = this.height;
    const tiles = this.tiles;
    tiles.fill(TILE.WALL);

    const stack = [];
    const maxX = Math.floor((w - 1) / 2);
    const maxY = Math.floor((h - 1) / 2);
    const startX = rng.nextInt(maxX) * 2 + 1;
    const startY = rng.nextInt(maxY) * 2 + 1;
    stack.push({ x: startX, y: startY });
    tiles[index(startX, startY, w)] = TILE.FLOOR;

    while (stack.length) {
      const { x, y } = stack[stack.length - 1];
      const neighbors = [];
      for (const dir of DIRS) {
        const nx = x + dir.dx * 2;
        const ny = y + dir.dy * 2;
        if (
          nx > 0 && ny > 0 && nx < w - 1 && ny < h - 1 &&
          tiles[index(nx, ny, w)] === TILE.WALL
        ) {
          neighbors.push({ dir, nx, ny });
        }
      }
      if (neighbors.length) {
        const n = neighbors[rng.nextInt(neighbors.length)];
        tiles[index(x + n.dir.dx, y + n.dir.dy, w)] = TILE.FLOOR;
        tiles[index(n.nx, n.ny, w)] = TILE.FLOOR;
        stack.push({ x: n.nx, y: n.ny });
      } else {
        stack.pop();
      }
    }

    this._placeSpecials(rng);
    this._addDetours(rng);
  }

  _randomFloor(rng) {
    const w = this.width;
    const h = this.height;
    let x, y;
    do {
      x = rng.nextInt(w - 2) + 1;
      y = rng.nextInt(h - 2) + 1;
    } while (this.tiles[index(x, y, w)] !== TILE.FLOOR);
    return { x, y };
  }

  _placeSpecials(rng) {
    const w = this.width;
    const h = this.height;
    const tiles = this.tiles;
    const chest = this._randomFloor(rng);
    tiles[index(chest.x, chest.y, w)] = TILE.CHEST;
    this.chest = chest;

    const sides = ['N', 'E', 'S', 'W'].filter(s => s !== this.entry);
    const side = sides[rng.nextInt(sides.length)];
    const door = this._doorPosition(side, rng);
    const back = DIRS.find(d => d.name === side);
    const ix = door.x - back.dx;
    const iy = door.y - back.dy;
    if (tiles[index(ix, iy, w)] === TILE.WALL) {
      tiles[index(ix, iy, w)] = TILE.FLOOR;
    }
    tiles[index(door.x, door.y, w)] = TILE.DOOR;
    this.door = { dir: side, x: door.x, y: door.y };

    if (!this._isReachable(chest, door)) {
      this.seed += '_retry';
      this._generate();
    }
  }

  _addDetours(rng) {
    const w = this.width;
    const h = this.height;
    const tiles = this.tiles;
    const base = Math.min(w, h);
    const max = Math.max(1, Math.floor(base / 3));
    let count = rng.nextInt(max) + 1;
    if (base >= 13) {
      count += 2;
    } else if (base >= 11) {
      count += 1;
    }
    for (let i = 0; i < count; i++) {
      const x = rng.nextInt(w - 2) + 1;
      const y = rng.nextInt(h - 2) + 1;
      const idx = index(x, y, w);
      if (tiles[idx] === TILE.WALL) {
        tiles[idx] = TILE.FLOOR;
      }
    }
  }

  _doorPosition(side, rng) {
    const w = this.width;
    const h = this.height;
    switch (side) {
      case 'N':
        return { x: rng.nextInt(w - 2) + 1, y: 0 };
      case 'S':
        return { x: rng.nextInt(w - 2) + 1, y: h - 1 };
      case 'W':
        return { x: 0, y: rng.nextInt(h - 2) + 1 };
      case 'E':
      default:
        return { x: w - 1, y: rng.nextInt(h - 2) + 1 };
    }
  }

  _isReachable(start, goal) {
    const w = this.width;
    const h = this.height;
    const tiles = this.tiles;
    const visited = new Uint8Array(w * h);
    const queue = [start];
    visited[index(start.x, start.y, w)] = 1;

    while (queue.length) {
      const { x, y } = queue.shift();
      if (x === goal.x && y === goal.y) return true;
      for (const dir of DIRS) {
        const nx = x + dir.dx;
        const ny = y + dir.dy;
        if (
          nx >= 0 && ny >= 0 && nx < w && ny < h &&
          !visited[index(nx, ny, w)] &&
          tiles[index(nx, ny, w)] !== TILE.WALL
        ) {
          visited[index(nx, ny, w)] = 1;
          queue.push({ x: nx, y: ny });
        }
      }
    }
    return false;
  }
}

export function createRectChunk(seed, width = 13, height = 13, entry = 'W') {
  if (width % 2 === 0) width += 1;
  if (height % 2 === 0) height += 1;
  return new MazeRectChunk(seed, width, height, entry);
}
