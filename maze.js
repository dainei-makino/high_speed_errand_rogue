// Maze generation utilities
const CHUNK_TABLE = [
  { width: 5, height: 5 },
  { width: 6, height: 5 },
  { width: 7, height: 5 },
  { width: 7, height: 7 },
  { width: 10, height: 5 }
];

export class MazeChunk {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.age = 0;
    this.fading = false;
    this.entrance = null;
    this.exit = null;
    this.chest = null;
    this.tiles = this._generateMaze(width, height);
  }

  _generateMaze(width, height) {
    const grid = Array.from({ length: height }, () =>
      Array.from({ length: width }, () => ({
        walls: { N: true, E: true, S: true, W: true },
        type: 'floor',
        visited: false
      }))
    );

    const stack = [];
    const startX = Math.floor(Math.random() * width);
    const startY = Math.floor(Math.random() * height);
    stack.push({ x: startX, y: startY });
    grid[startY][startX].visited = true;

    const dirs = [
      { dx: 0, dy: -1, w: 'N', o: 'S' },
      { dx: 1, dy: 0, w: 'E', o: 'W' },
      { dx: 0, dy: 1, w: 'S', o: 'N' },
      { dx: -1, dy: 0, w: 'W', o: 'E' }
    ];

    while (stack.length) {
      const cur = stack[stack.length - 1];
      const neighbors = dirs
        .map(d => ({
          dir: d,
          nx: cur.x + d.dx,
          ny: cur.y + d.dy
        }))
        .filter(n =>
          n.nx >= 0 &&
          n.ny >= 0 &&
          n.nx < width &&
          n.ny < height &&
          !grid[n.ny][n.nx].visited
        );

      if (neighbors.length) {
        const next = neighbors[Math.floor(Math.random() * neighbors.length)];
        grid[cur.y][cur.x].walls[next.dir.w] = false;
        grid[next.ny][next.nx].walls[next.dir.o] = false;
        grid[next.ny][next.nx].visited = true;
        stack.push({ x: next.nx, y: next.ny });
      } else {
        stack.pop();
      }
    }

    for (const row of grid) {
      for (const cell of row) {
        delete cell.visited;
      }
    }

    this._placeObjects(grid);
    return grid;
  }

  _placeObjects(grid) {
    const width = this.width;
    const height = this.height;
    const randCell = () => ({
      x: Math.floor(Math.random() * width),
      y: Math.floor(Math.random() * height)
    });

    this.entrance = randCell();
    grid[this.entrance.y][this.entrance.x].type = 'entrance';

    do {
      this.exit = randCell();
    } while (this.exit.x === this.entrance.x && this.exit.y === this.entrance.y);
    grid[this.exit.y][this.exit.x].type = 'exit';

    do {
      this.chest = randCell();
    } while (
      (this.chest.x === this.entrance.x && this.chest.y === this.entrance.y) ||
      (this.chest.x === this.exit.x && this.chest.y === this.exit.y)
    );
    grid[this.chest.y][this.chest.x].type = Math.random() < 0.2 ? 'itemChest' : 'chest';
  }
}

export function generateChunk(progress) {
  const idx = Math.min(Math.floor(progress / 5), CHUNK_TABLE.length - 1);
  const { width, height } = CHUNK_TABLE[idx];
  return new MazeChunk(width, height);
}

