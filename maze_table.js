export const MAZE_TABLE = [
  { stage: 1, sizes: [13] },
  { stage: 2, sizes: [9, 11, 13] }
];

export function pickMazeConfig(stage) {
  const entry = [...MAZE_TABLE].reverse().find(e => stage >= e.stage) || MAZE_TABLE[0];
  const sizes = entry.sizes;
  const size = sizes[Math.floor(Math.random() * sizes.length)];
  return { size };
}
