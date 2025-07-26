export const MAZE_TABLE = [
  { stage: 1, sizes: [{ w: 7, h: 7 }] },
  // From the second chunk onward allow a wider range including 7 again
  {
    stage: 2,
    sizes: [
      { w: 7, h: 7 },
      { w: 9, h: 9 },
      { w: 11, h: 11 },
      { w: 13, h: 13 },
      { w: 5, h: 13 },
      { w: 7, h: 13 },
      { w: 9, h: 13 }
    ]
  }
];

export function pickMazeConfig(stage, progress = 0) {
  if (progress >= 30) {
    return { width: 13, height: 13 };
  }
  const entry = [...MAZE_TABLE].reverse().find(e => stage >= e.stage) || MAZE_TABLE[0];
  let sizes = entry.sizes.slice();
  // Gate larger chunk sizes by progress
  if (progress < 6) {
    sizes = sizes.filter(s => Math.max(s.w, s.h) < 11);
  } else if (progress < 9) {
    sizes = sizes.filter(s => Math.max(s.w, s.h) <= 11);
  }
  if (!sizes.length) sizes = entry.sizes;
  const pick = sizes[Math.floor(Math.random() * sizes.length)];
  return { width: pick.w, height: pick.h };
}
