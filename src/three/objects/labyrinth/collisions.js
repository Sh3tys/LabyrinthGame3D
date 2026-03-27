import { areLinked } from "./mazeGen.js";
import { WALL_HEIGHT } from "./config.js";

// ─── Wall collision generation ────────────────────────────────

/**
 * Builds collision boxes for all walls in the maze based on the generated maze graph
 * Returns array of blocks with position and size for collision detection
 */
export function buildWallCollisions(
  cols,
  rows,
  cellSize,
  wallThickness,
  links,
) {
  const cellPitch = cellSize;
  const wallSpan = cellPitch;
  const blocks = [];

  const cellCenterX = (x) => (x - (cols - 1) / 2) * cellPitch;
  const cellCenterZ = (y) => (y - (rows - 1) / 2) * cellPitch;

  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < cols; x += 1) {
      const cx = cellCenterX(x);
      const cz = cellCenterZ(y);

      const isExit = x === cols - 1 && y === rows - 1;
      if (x === 0) {
        blocks.push({
          position: [cx - cellSize / 2, WALL_HEIGHT / 2, cz],
          size: [wallThickness, WALL_HEIGHT, wallSpan],
        });
      }
      if (x === cols - 1 && !isExit) {
        blocks.push({
          position: [cx + cellSize / 2, WALL_HEIGHT / 2, cz],
          size: [wallThickness, WALL_HEIGHT, wallSpan],
        });
      }
      if (y === 0) {
        blocks.push({
          position: [cx, WALL_HEIGHT / 2, cz - cellSize / 2],
          size: [wallSpan, WALL_HEIGHT, wallThickness],
        });
      }
      if (y === rows - 1 && !isExit) {
        blocks.push({
          position: [cx, WALL_HEIGHT / 2, cz + cellSize / 2],
          size: [wallSpan, WALL_HEIGHT, wallThickness],
        });
      }

      if (x < cols - 1 && !areLinked(links, x, y, x + 1, y)) {
        blocks.push({
          position: [cx + cellSize / 2, WALL_HEIGHT / 2, cz],
          size: [wallThickness, WALL_HEIGHT, wallSpan],
        });
      }

      if (y < rows - 1 && !areLinked(links, x, y, x, y + 1)) {
        blocks.push({
          position: [cx, WALL_HEIGHT / 2, cz + cellSize / 2],
          size: [wallSpan, WALL_HEIGHT, wallThickness],
        });
      }
    }
  }

  return { blocks, cellPitch };
}
