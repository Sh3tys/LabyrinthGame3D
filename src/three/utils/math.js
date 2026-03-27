// ─── Generic math utilities ───────────────────────────────────

/**
 * Clamps a value between min and max bounds
 */
export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
