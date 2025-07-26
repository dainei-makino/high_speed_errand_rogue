export const MAZE_TABLE = [
  { stage: 1, sizes: [7] },
  // From the second chunk onward allow a wider range including 7 again
  { stage: 2, sizes: [7, 9, 11, 13] }
];

export function pickMazeConfig(stage, progress = 0) {
  if (progress >= 30) {
    return { size: 13 };
  }
  // Force larger 13x13 chunks for specific progress ranges
  if (progress >= 22) {
    if (progress < 29) {
      return { size: 13 };
    }
  } else if (progress >= 12) {
    if (progress < 17) {
      return { size: 13 };
    }
  }
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
