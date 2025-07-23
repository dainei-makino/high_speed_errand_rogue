// Maze generation utilities following docs/maze_core_core mechanics.md
export const TILE_TYPES = {
  WALL: 0,
  FLOOR: 1,
  KEY_CHEST: 2,
  DOOR: 3,
  ITEM_CHEST: 4,
  CONNECTOR: 5
};

const CHUNK_TABLE = [
  { width: 20, height: 20 }
];

export class MazeChunk {
  constructor(width, height, seed = Math.random().toString(36).slice(2)) {
    this.width = width;
    this.height = height;
    this.seed = seed;
    this.tiles = new Uint8Array(width * height);
    this.age = 0;
    this.entrance = null;
    this.door = null;
    this.chest = null;
    this._generate();
  }

  _generate() {
    const { width, height } = this;
    this.tiles.fill(TILE_TYPES.WALL);

    const dirs = [
      { dx: 0, dy: -1 },
      { dx: 1, dy: 0 },
      { dx: 0, dy: 1 },
      { dx: -1, dy: 0 }
    ];

    const stack = [];
    const visited = Array.from({ length: height }, () =>
      Array(width).fill(false)
    );

    const startX = Math.floor(Math.random() * (width - 2)) + 1;
    const startY = Math.floor(Math.random() * (height - 2)) + 1;
    this.tiles[startY * width + startX] = TILE_TYPES.FLOOR;
    visited[startY][startX] = true;
    stack.push({ x: startX, y: startY });

    while (stack.length) {
      const cur = stack[stack.length - 1];
      const neighbors = dirs
        .map(d => ({ nx: cur.x + d.dx, ny: cur.y + d.dy }))
        .filter(n =>
          n.nx > 0 &&
          n.ny > 0 &&
          n.nx < width - 1 &&
          n.ny < height - 1 &&
          !visited[n.ny][n.nx]
        );

      if (neighbors.length) {
        const next = neighbors[Math.floor(Math.random() * neighbors.length)];
        visited[next.ny][next.nx] = true;
        this.tiles[next.ny * width + next.nx] = TILE_TYPES.FLOOR;
        stack.push({ x: next.nx, y: next.ny });
      } else {
        stack.pop();
      }
    }

    this._placeObjects();
  }

  _randInnerCell() {
    let x, y;
    do {
      x = Math.floor(Math.random() * (this.width - 2)) + 1;
      y = Math.floor(Math.random() * (this.height - 2)) + 1;
    } while (this.tiles[y * this.width + x] === TILE_TYPES.WALL);
    return { x, y };
  }

  _randDoor() {
    const { width, height } = this;
    const sides = ['N', 'E', 'S', 'W'];
    for (let i = 0; i < 50; i++) {
      const side = sides[Math.floor(Math.random() * 4)];
      if (side === 'N') {
        const x = Math.floor(Math.random() * (width - 2)) + 1;
        if (this.tiles[1 * width + x] === TILE_TYPES.FLOOR) {
          return { x, y: 0 };
        }
      } else if (side === 'S') {
        const x = Math.floor(Math.random() * (width - 2)) + 1;
        if (this.tiles[(height - 2) * width + x] === TILE_TYPES.FLOOR) {
          return { x, y: height - 1 };
        }
      } else if (side === 'E') {
        const y = Math.floor(Math.random() * (height - 2)) + 1;
        if (this.tiles[y * width + (width - 2)] === TILE_TYPES.FLOOR) {
          return { x: width - 1, y };
        }
      } else {
        const y = Math.floor(Math.random() * (height - 2)) + 1;
        if (this.tiles[y * width + 1] === TILE_TYPES.FLOOR) {
          return { x: 0, y };
        }
      }
    }
    // fallback search
    for (let x = 1; x < width - 1; x++) {
      if (this.tiles[1 * width + x] === TILE_TYPES.FLOOR) return { x, y: 0 };
      if (this.tiles[(height - 2) * width + x] === TILE_TYPES.FLOOR)
        return { x, y: height - 1 };
    }
    for (let y = 1; y < height - 1; y++) {
      if (this.tiles[y * width + 1] === TILE_TYPES.FLOOR) return { x: 0, y };
      if (this.tiles[y * width + (width - 2)] === TILE_TYPES.FLOOR)
        return { x: width - 1, y };
    }
    return { x: 0, y: 1 };
  }

  _isReachable(from, to) {
    const { width, height } = this;
    const visited = Array.from({ length: height }, () => Array(width).fill(false));
    const q = [from];
    visited[from.y][from.x] = true;
    while (q.length) {
      const c = q.shift();
      if (c.x === to.x && c.y === to.y) return true;
      const dirs = [
        { dx: 0, dy: -1 },
        { dx: 1, dy: 0 },
        { dx: 0, dy: 1 },
        { dx: -1, dy: 0 }
      ];
      for (const d of dirs) {
        const nx = c.x + d.dx;
        const ny = c.y + d.dy;
        if (
          nx >= 0 &&
          ny >= 0 &&
          nx < width &&
          ny < height &&
          !visited[ny][nx] &&
          this.tiles[ny * width + nx] !== TILE_TYPES.WALL
        ) {
          visited[ny][nx] = true;
          q.push({ x: nx, y: ny });
        }
      }
    }
    return false;
  }

  _placeObjects() {
    const width = this.width;
    const height = this.height;
    let attempts = 0;
    let valid = false;
    do {
      this.entrance = this._randInnerCell();
      this.door = this._randDoor();
      this.chest = this._randInnerCell();
      valid = this.door.x !== this.entrance.x || this.door.y !== this.entrance.y;
      valid = valid && (this.chest.x !== this.entrance.x || this.chest.y !== this.entrance.y);
      valid = valid && (this.chest.x !== this.door.x || this.chest.y !== this.door.y);
      valid = valid && this._isReachable(this.chest, this.door);
      attempts++;
    } while (!valid && attempts < 10);

    this.tiles[this.door.y * width + this.door.x] = TILE_TYPES.DOOR;
    this.tiles[this.chest.y * width + this.chest.x] =
      Math.random() < 0.2 ? TILE_TYPES.ITEM_CHEST : TILE_TYPES.KEY_CHEST;
  }
}

export function generateChunk(progress) {
  const idx = Math.min(Math.floor(progress / 5), CHUNK_TABLE.length - 1);
  const { width, height } = CHUNK_TABLE[idx];
  return new MazeChunk(width, height);
}

