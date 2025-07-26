export const MAZE_TABLE = [
  { stage: 1, shapes: [{ size: 7 }] },
  // From the second chunk onward allow a wider range including 7 again
  { stage: 2, shapes: [{ size: 7 }, { size: 9 }, { size: 11 }, { size: 13 }] },
  // Introduce 5x13 rectangular chunks from chunk 12 onward
  { stage: 12, shapes: [{ width: 5, height: 13 }] },
  // Introduce 7x13 rectangular chunks from chunk 22 onward
  { stage: 22, shapes: [{ width: 7, height: 13 }] }
];

export function pickMazeConfig(stage, progress = 0) {
  if (progress >= 30) {
    return { size: 13 };
  }

  // Gather all available shapes up to the current stage
  let shapes = [];
  for (const entry of MAZE_TABLE) {
    if (stage >= entry.stage) {
      shapes = shapes.concat(entry.shapes);
    } else {
      break;
    }
  }

  // Extract square sizes for gating logic
  let sizes = shapes.filter(s => 'size' in s).map(s => s.size);
  if (progress < 6) {
    // Only 7x7 and 9x9 before the 7th chunk
    sizes = sizes.filter(s => s < 11);
  } else if (progress < 9) {
    // Allow up to 11x11 from chunks 7-9
    sizes = sizes.filter(s => s <= 11);
  }

  // Filter shapes based on allowed square sizes
  let allowed = shapes.filter(s => {
    if ('size' in s) {
      return sizes.includes(s.size);
    }
    return true; // rectangular shapes are not size-gated
  });

  if (!allowed.length) allowed = shapes;
  const choice = allowed[Math.floor(Math.random() * allowed.length)];
  return choice;
}
