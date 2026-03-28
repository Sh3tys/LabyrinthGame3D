import { keyFor, shuffleInPlace } from "./utils.js";

// ─── Maze generation using depth-first search ─────────────────

/**
 * Generates a maze graph using depth-first search algorithm
 * Returns links between adjacent cells and start/exit cells
 */
export function generateMazeGraph(cols, rows) {
  const visited = new Set();
  const links = new Map();
  const stack = [{ x: 0, y: 0 }];
  visited.add(keyFor(0, 0));
  links.set(keyFor(0, 0), new Set());

  const directions = [
    { dx: 1, dy: 0 },
    { dx: -1, dy: 0 },
    { dx: 0, dy: 1 },
    { dx: 0, dy: -1 },
  ];

  while (stack.length > 0) {
    const current = stack[stack.length - 1];
    const candidates = [];

    for (const dir of directions) {
      const nx = current.x + dir.dx;
      const ny = current.y + dir.dy;
      if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
      if (!visited.has(keyFor(nx, ny))) {
        candidates.push({ x: nx, y: ny });
      }
    }

    if (candidates.length === 0) {
      stack.pop();
      continue;
    }

    shuffleInPlace(candidates);
    const next = candidates[0];
    const a = keyFor(current.x, current.y);
    const b = keyFor(next.x, next.y);

    if (!links.has(a)) links.set(a, new Set());
    if (!links.has(b)) links.set(b, new Set());

    links.get(a).add(b);
    links.get(b).add(a);

    visited.add(b);
    stack.push(next);
  }

  return {
    links,
    startCell: { x: 0, y: 0 },
    exitCell: { x: cols - 1, y: rows - 1 },
  };
}

/**
 * Checks if two adjacent cells are directly linked (no wall between them)
 */
export function areLinked(links, ax, ay, bx, by) {
  const a = keyFor(ax, ay);
  const b = keyFor(bx, by);
  const neighbors = links.get(a);
  return neighbors ? neighbors.has(b) : false;
}
