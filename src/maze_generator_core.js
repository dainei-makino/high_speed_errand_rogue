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

function index(x, y, width) {
  return y * width + x;
}

export class MazeChunk {
  constructor(seed = 'seed', width = 13, height = 13, entry = 'W') {
    if (width % 2 === 0) width += 1;
    if (height % 2 === 0) height += 1;
    this.width = width;
    this.height = height;
    this.size = Math.max(width, height);
    this.seed = seed;
    this.entry = entry;
    this.tiles = new Uint8Array(width * height);
    this.door = null;
    this.chest = null;
    this._generate();
  }

  _generate() {
    const rng = new RNG(this.seed);
    const { width, height } = this;
    const tiles = this.tiles;
    tiles.fill(TILE.WALL);

    const stack = [];
    // ensure starting position is on an odd tile so that the
    // maze paths reach the very first interior row/column
    // (avoids double-thick walls on the north and west edges)
    const maxX = Math.floor((width - 1) / 2);
    const maxY = Math.floor((height - 1) / 2);
    const startX = rng.nextInt(maxX) * 2 + 1;
    const startY = rng.nextInt(maxY) * 2 + 1;
    stack.push({ x: startX, y: startY });
    tiles[index(startX, startY, width)] = TILE.FLOOR;

    while (stack.length) {
      const { x, y } = stack[stack.length - 1];
      const neighbors = [];
      for (const dir of DIRS) {
        const nx = x + dir.dx * 2;
        const ny = y + dir.dy * 2;
        if (
          nx > 0 &&
          ny > 0 &&
          nx < width - 1 &&
          ny < height - 1 &&
          tiles[index(nx, ny, width)] === TILE.WALL
        ) {
          neighbors.push({ dir, nx, ny });
        }
      }
      if (neighbors.length) {
        const n = neighbors[rng.nextInt(neighbors.length)];
        tiles[index(x + n.dir.dx, y + n.dir.dy, width)] = TILE.FLOOR;
        tiles[index(n.nx, n.ny, width)] = TILE.FLOOR;
        stack.push({ x: n.nx, y: n.ny });
      } else {
        stack.pop();
      }
    }

    this._placeSpecials(rng);
    this._addDetours(rng);
  }

  _randomFloor(rng) {
    const { width, height } = this;
    let x, y;
    do {
      x = rng.nextInt(width - 2) + 1;
      y = rng.nextInt(height - 2) + 1;
    } while (this.tiles[index(x, y, width)] !== TILE.FLOOR);
    return { x, y };
  }

  _placeSpecials(rng) {
    const { width, height } = this;
    const tiles = this.tiles;
    // place chest
    const chest = this._randomFloor(rng);
    this.tiles[index(chest.x, chest.y, width)] = TILE.CHEST;
    this.chest = chest;

    // place door on a side not equal to entry
    const sides = ['N', 'E', 'S', 'W'].filter(s => s !== this.entry);
    const side = sides[rng.nextInt(sides.length)];
    const door = this._doorPosition(side, rng);
    const back = DIRS.find(d => d.name === side);
    // carve a passage leading to the door if necessary
    const ix = door.x - back.dx;
    const iy = door.y - back.dy;
    if (tiles[index(ix, iy, width)] === TILE.WALL) {
      tiles[index(ix, iy, width)] = TILE.FLOOR;
    }
    tiles[index(door.x, door.y, width)] = TILE.DOOR;
    this.door = { dir: side, x: door.x, y: door.y };

    // verify reachability; if not reachable, regenerate with different seed
    if (!this._isReachable(chest, door)) {
      this.seed += '_retry';
      this._generate();
    }
  }

  _addDetours(rng) {
    const { width, height } = this;
    const tiles = this.tiles;
    const max = Math.max(1, Math.floor(Math.max(width, height) / 3));
    let count = rng.nextInt(max) + 1;
    if (Math.max(width, height) >= 13) {
      count += 2;
    } else if (Math.max(width, height) >= 11) {
      count += 1;
    }
    for (let i = 0; i < count; i++) {
      const x = rng.nextInt(width - 2) + 1;
      const y = rng.nextInt(height - 2) + 1;
      const idx = index(x, y, width);
      if (tiles[idx] === TILE.WALL) {
        tiles[idx] = TILE.FLOOR;
      }
    }
  }

  _doorPosition(side, rng) {
    const { width, height } = this;
    switch (side) {
      case 'N':
        return { x: rng.nextInt(width - 2) + 1, y: 0 };
      case 'S':
        return { x: rng.nextInt(width - 2) + 1, y: height - 1 };
      case 'W':
        return { x: 0, y: rng.nextInt(height - 2) + 1 };
      case 'E':
      default:
        return { x: width - 1, y: rng.nextInt(height - 2) + 1 };
    }
  }

  _isReachable(start, goal) {
    const { width, height } = this;
    const tiles = this.tiles;
    const visited = new Uint8Array(width * height);
    const queue = [start];
    visited[index(start.x, start.y, width)] = 1;

    while (queue.length) {
      const { x, y } = queue.shift();
      if (x === goal.x && y === goal.y) return true;
      for (const dir of DIRS) {
        const nx = x + dir.dx;
        const ny = y + dir.dy;
        if (
          nx >= 0 &&
          ny >= 0 &&
          nx < width &&
          ny < height &&
          !visited[index(nx, ny, width)] &&
          tiles[index(nx, ny, width)] !== TILE.WALL
        ) {
          visited[index(nx, ny, width)] = 1;
          queue.push({ x: nx, y: ny });
        }
      }
    }
    return false;
  }
}

export function createChunk(seed, width = 13, height = width, entry = 'W') {
  if (width % 2 === 0) width += 1;
  if (height % 2 === 0) height += 1;
  return new MazeChunk(seed, width, height, entry);
}
