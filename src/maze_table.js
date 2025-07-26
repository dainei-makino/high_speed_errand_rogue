export const MAZE_TABLE = [
  { stage: 1, sizes: [7] },
  // From the second chunk onward allow a wider range including 7 again
  { stage: 2, sizes: [7, 9, 11, 13] }
];

export function pickMazeConfig(stage, progress = 0) {
  const entry = [...MAZE_TABLE].reverse().find(e => stage >= e.stage) || MAZE_TABLE[0];
  let sizes = entry.sizes.slice();
  // Gate larger chunk sizes by progress
  if (progress < 6) {
    // Only 7x7 and 9x9 before the 7th chunk
    sizes = sizes.filter(s => s < 11);
  } else if (progress < 9) {
    // Allow up to 11x11 from chunks 7-9
    sizes = sizes.filter(s => s <= 11);
  }
  if (!sizes.length) sizes = entry.sizes;
  const size = sizes[Math.floor(Math.random() * sizes.length)];
  return { size };
}
