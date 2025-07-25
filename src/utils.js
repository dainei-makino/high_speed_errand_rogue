export function isHorizontal(dir) {
  return dir === 'left' || dir === 'right';
}

export function isVertical(dir) {
  return dir === 'up' || dir === 'down';
}

export function computeTetherPoints(ax, ay, bx, by, sagFactor, steps = 16) {
  const dx = bx - ax;
  const dy = by - ay;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const sag = Math.min(sagFactor, dist / 4);
  const midX = (ax + bx) / 2;
  const midY = Math.max(ay, by) + sag;
  const points = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const inv = 1 - t;
    const x = inv * inv * ax + 2 * inv * t * midX + t * t * bx;
    const y = inv * inv * ay + 2 * inv * t * midY + t * t * by;
    points.push({ x, y });
  }
  return points;
}
