export const MAZE_TABLE = [
  { stage: 1, sizes: [7] },
  // From the second chunk onward allow 7, 9 and 13 but keep 11 until later
  { stage: 2, sizes: [7, 9, 13] },
  // Starting with the seventh chunk, enable 11x11 generation as well
  { stage: 7, sizes: [7, 9, 11, 13] }
];

export function pickMazeConfig(stage) {
  const entry = [...MAZE_TABLE].reverse().find(e => stage >= e.stage) || MAZE_TABLE[0];
  const sizes = entry.sizes;
  const size = sizes[Math.floor(Math.random() * sizes.length)];
  return { size };
}
