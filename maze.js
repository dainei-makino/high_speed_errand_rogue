// Maze generation utilities
const CHUNK_TABLE = [
  { width: 20, height: 20 }
];

export class MazeChunk {
  constructor(width, height, entranceSpec = null) {
    this.width = width;
    this.height = height;
    this.age = 0;
    this.fading = false;
    this.entrance = null;
    this.exit = null;
    this.chest = null;
    this.entranceDir = null;
    this.exitDir = null;
    this.tiles = this._generateMaze(width, height, entranceSpec);
  }

  _generateMaze(width, height, entranceSpec) {
    const grid = Array.from({ length: height }, () =>
      Array.from({ length: width }, () => ({
        walls: { N: true, E: true, S: true, W: true },
        type: 'floor',
        visited: false
      }))
    );

    const stack = [];
    const startX = Math.floor(Math.random() * (width - 2)) + 1;
    const startY = Math.floor(Math.random() * (height - 2)) + 1;
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
          n.nx > 0 &&
          n.ny > 0 &&
          n.nx < width - 1 &&
          n.ny < height - 1 &&
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

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (x === 0 || y === 0 || x === width - 1 || y === height - 1) {
          grid[y][x] = { type: 'wall' };
        } else {
          delete grid[y][x].visited;
        }
      }
    }

    this._placeObjects(grid, entranceSpec);
    return grid;
  }

  _placeObjects(grid, entranceSpec) {
    const width = this.width;
    const height = this.height;
    const randCell = () => ({
      x: Math.floor(Math.random() * (width - 2)) + 1,
      y: Math.floor(Math.random() * (height - 2)) + 1
    });

    if (entranceSpec) {
      const { dir, coord } = entranceSpec;
      this.entranceDir = dir;
      switch (dir) {
        case 'N':
          this.entrance = { x: coord, y: 0 };
          grid[0][coord].type = 'entrance';
          if (grid[1][coord].walls) grid[1][coord].walls.N = false;
          break;
        case 'E':
          this.entrance = { x: width - 1, y: coord };
          grid[coord][width - 1].type = 'entrance';
          if (grid[coord][width - 2].walls) grid[coord][width - 2].walls.E = false;
          break;
        case 'S':
          this.entrance = { x: coord, y: height - 1 };
          grid[height - 1][coord].type = 'entrance';
          if (grid[height - 2][coord].walls) grid[height - 2][coord].walls.S = false;
          break;
        case 'W':
          this.entrance = { x: 0, y: coord };
          grid[coord][0].type = 'entrance';
          if (grid[coord][1].walls) grid[coord][1].walls.W = false;
          break;
      }
    } else {
      this.entrance = randCell();
      grid[this.entrance.y][this.entrance.x].type = 'entrance';
    }

    const exitDirs = ['N', 'E', 'S', 'W'];
    this.exitDir = exitDirs[Math.floor(Math.random() * 4)];
    switch (this.exitDir) {
      case 'N':
        this.exit = { x: Math.floor(Math.random() * (width - 2)) + 1, y: 0 };
        grid[0][this.exit.x].type = 'exit';
        if (grid[1][this.exit.x].walls) grid[1][this.exit.x].walls.N = false;
        break;
      case 'E':
        this.exit = { x: width - 1, y: Math.floor(Math.random() * (height - 2)) + 1 };
        grid[this.exit.y][width - 1].type = 'exit';
        if (grid[this.exit.y][width - 2].walls) grid[this.exit.y][width - 2].walls.E = false;
        break;
      case 'S':
        this.exit = { x: Math.floor(Math.random() * (width - 2)) + 1, y: height - 1 };
        grid[height - 1][this.exit.x].type = 'exit';
        if (grid[height - 2][this.exit.x].walls) grid[height - 2][this.exit.x].walls.S = false;
        break;
      case 'W':
        this.exit = { x: 0, y: Math.floor(Math.random() * (height - 2)) + 1 };
        grid[this.exit.y][0].type = 'exit';
        if (grid[this.exit.y][1].walls) grid[this.exit.y][1].walls.W = false;
        break;
    }

    do {
      this.chest = randCell();
    } while (
      (this.chest.x === this.entrance.x && this.chest.y === this.entrance.y) ||
      (this.chest.x === this.exit.x && this.chest.y === this.exit.y)
    );
    grid[this.chest.y][this.chest.x].type = Math.random() < 0.2 ? 'itemChest' : 'chest';
  }
}

export function generateChunk(progress, entranceSpec = null) {
  const idx = Math.min(Math.floor(progress / 5), CHUNK_TABLE.length - 1);
  const { width, height } = CHUNK_TABLE[idx];
  return new MazeChunk(width, height, entranceSpec);
}

