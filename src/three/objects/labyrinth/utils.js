// ─── Labyrinth-specific utilities ─────────────────────────────

/**
 * Creates a cache key for a maze cell at coordinates (x, y)
 */
export function keyFor(x, y) {
  return `${x},${y}`;
}

/**
 * In-place Fisher-Yates shuffle for maze generation
 */
export function shuffleInPlace(arr) {
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
}
