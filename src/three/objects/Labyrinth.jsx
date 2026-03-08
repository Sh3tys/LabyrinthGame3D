import React, { useMemo } from "react";
import { Wall } from "./Wall.jsx";
import * as THREE from "three";

const WALL_HEIGHT = 4.5;
const PLAYER_RADIUS = 0.4;
const PLAYER_HEIGHT = 2.0;
const CAMERA_RADIUS = 0.25;
const CAMERA_HEIGHT = 0.8;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

/**
 * Generates a random maze using Recursive Backtracking.
 * 1 = Wall, 0 = Path
 */
function generateMaze(width, height) {
  const maze = Array.from({ length: height }, () => Array(width).fill(1));

  function walk(x, y) {
    maze[y][x] = 0;

    const dirs = [
      [0, -2], [0, 2], [-2, 0], [2, 0]
    ].sort(() => Math.random() - 0.5);

    for (const [dx, dy] of dirs) {
      const nx = x + dx;
      const ny = y + dy;

      if (ny >= 0 && ny < height && nx >= 0 && nx < width && maze[ny][nx] === 1) {
        maze[y + dy / 2][x + dx / 2] = 0;
        walk(nx, ny);
      }
    }
  }

  walk(1, 1);

  // Keep an explicit solid outer ring so the maze is always closed.
  for (let x = 0; x < width; x += 1) {
    maze[0][x] = 1;
    maze[height - 1][x] = 1;
  }
  for (let y = 0; y < height; y += 1) {
    maze[y][0] = 1;
    maze[y][width - 1] = 1;
  }

  // Guaranteed valid spawn cell.
  maze[1][1] = 0;
  return maze;
}

export function Labyrinth({ width = 21, height = 21, cellSize = 2, onReady }) {
  // Recursive-backtracking works best with odd dimensions.
  const normalizedWidth = width % 2 === 0 ? width + 1 : width;
  const normalizedHeight = height % 2 === 0 ? height + 1 : height;
  const maze = useMemo(
    () => generateMaze(normalizedWidth, normalizedHeight),
    [normalizedWidth, normalizedHeight],
  );

  const mazeHalfWidth = (normalizedWidth * cellSize) / 2;
  const mazeHalfHeight = (normalizedHeight * cellSize) / 2;

  // Merge contiguous wall cells into larger rectangular blocks.
  const wallBlocks = useMemo(() => {
    const visited = Array.from({ length: normalizedHeight }, () => Array(normalizedWidth).fill(false));
    const blocks = [];

    for (let y = 0; y < normalizedHeight; y += 1) {
      for (let x = 0; x < normalizedWidth; x += 1) {
        if (maze[y][x] !== 1 || visited[y][x]) continue;

        let runWidth = 0;
        while (
          x + runWidth < normalizedWidth
          && maze[y][x + runWidth] === 1
          && !visited[y][x + runWidth]
        ) {
          runWidth += 1;
        }

        let runHeight = 1;
        let growing = true;
        while (y + runHeight < normalizedHeight && growing) {
          for (let ix = 0; ix < runWidth; ix += 1) {
            if (maze[y + runHeight][x + ix] !== 1 || visited[y + runHeight][x + ix]) {
              growing = false;
              break;
            }
          }
          if (growing) runHeight += 1;
        }

        for (let zy = 0; zy < runHeight; zy += 1) {
          for (let ix = 0; ix < runWidth; ix += 1) {
            visited[y + zy][x + ix] = true;
          }
        }

        blocks.push({ x, y, width: runWidth, height: runHeight });
      }
    }

    return blocks;
  }, [maze, normalizedWidth, normalizedHeight]);

  // Collisions: simple AABB check for the player
  const wallBoxes = useMemo(() => {
    const boxes = [];
    wallBlocks.forEach((block) => {
      const minX = (block.x - normalizedWidth / 2) * cellSize - cellSize / 2;
      const minZ = (block.y - normalizedHeight / 2) * cellSize - cellSize / 2;
      const maxX = minX + block.width * cellSize;
      const maxZ = minZ + block.height * cellSize;

      boxes.push(new THREE.Box3(
        new THREE.Vector3(minX, 0, minZ),
        new THREE.Vector3(maxX, WALL_HEIGHT, maxZ),
      ));
    });
    return boxes;
  }, [wallBlocks, normalizedWidth, normalizedHeight, cellSize]);

  const collisionProvider = useMemo(() => {
    const tmpStepDelta = new THREE.Vector3();
    const tmpTryPos = new THREE.Vector3();
    const tmpStart = new THREE.Vector3();
    const tmpEnd = new THREE.Vector3();
    const tmpCandidate = new THREE.Vector3();
    const tmpSafe = new THREE.Vector3();

    const clampPositionInPlace = (pos, radius = PLAYER_RADIUS) => {
      pos.x = clamp(
        pos.x,
        -mazeHalfWidth + cellSize + radius,
        mazeHalfWidth - cellSize - radius,
      );
      pos.z = clamp(
        pos.z,
        -mazeHalfHeight + cellSize + radius,
        mazeHalfHeight - cellSize - radius,
      );
      return pos;
    };

    const makeBodyBox = (pos, radius, bodyHeight) => {
      return new THREE.Box3(
        new THREE.Vector3(pos.x - radius, 0, pos.z - radius),
        new THREE.Vector3(pos.x + radius, bodyHeight, pos.z + radius),
      );
    };

    const updateBodyBox = (bodyBox, pos, radius, bodyHeight) => {
      bodyBox.min.set(pos.x - radius, 0, pos.z - radius);
      bodyBox.max.set(pos.x + radius, bodyHeight, pos.z + radius);
    };

    const isBlockedAt = (pos, radius = PLAYER_RADIUS, bodyHeight = PLAYER_HEIGHT) => {
      const bodyBox = makeBodyBox(pos, radius, bodyHeight);

      for (const wall of wallBoxes) {
        if (bodyBox.intersectsBox(wall)) return true;
      }

      return false;
    };

    const resolveBodyCollisions = (
      pos,
      radius = PLAYER_RADIUS,
      bodyHeight = PLAYER_HEIGHT,
    ) => {
      // Keep body inside the outer ring and avoid clipping through walls.
      clampPositionInPlace(pos, radius);

      const bodyBox = makeBodyBox(pos, radius, bodyHeight);

      // A couple of passes handle corner contact without tunneling through merged blocks.
      for (let pass = 0; pass < 3; pass += 1) {
        let changed = false;

        for (const wall of wallBoxes) {
          if (!bodyBox.intersectsBox(wall)) continue;

          const overlapX = Math.min(bodyBox.max.x - wall.min.x, wall.max.x - bodyBox.min.x);
          const overlapZ = Math.min(bodyBox.max.z - wall.min.z, wall.max.z - bodyBox.min.z);

          if (overlapX <= 0 || overlapZ <= 0) continue;

          const bodyCenterX = (bodyBox.min.x + bodyBox.max.x) * 0.5;
          const wallCenterX = (wall.min.x + wall.max.x) * 0.5;
          const bodyCenterZ = (bodyBox.min.z + bodyBox.max.z) * 0.5;
          const wallCenterZ = (wall.min.z + wall.max.z) * 0.5;

          if (overlapX < overlapZ) {
            pos.x += bodyCenterX >= wallCenterX ? overlapX : -overlapX;
          } else {
            pos.z += bodyCenterZ >= wallCenterZ ? overlapZ : -overlapZ;
          }

          clampPositionInPlace(pos, radius);

          updateBodyBox(bodyBox, pos, radius, bodyHeight);
          changed = true;
        }

        if (!changed) break;
      }

      return pos;
    };

    return {
    clampPosition: (pos, radius = PLAYER_RADIUS) => {
      return clampPositionInPlace(pos, radius);
    },

    moveAndSlide: (
      pos,
      delta,
      radius = PLAYER_RADIUS,
      bodyHeight = PLAYER_HEIGHT,
      maxStep = 0.18,
    ) => {
      const dist = delta.length();
      if (dist <= 0) return pos;

      const steps = Math.max(1, Math.ceil(dist / maxStep));
      const stepDelta = tmpStepDelta.copy(delta).multiplyScalar(1 / steps);
      const tryPos = tmpTryPos;

      for (let i = 0; i < steps; i += 1) {
        // Try full step first.
        tryPos.copy(pos).add(stepDelta);
        clampPositionInPlace(tryPos, radius);

        if (!isBlockedAt(tryPos, radius, bodyHeight)) {
          pos.copy(tryPos);
          continue;
        }

        // Slide on X axis.
        tryPos.copy(pos);
        tryPos.x += stepDelta.x;
        clampPositionInPlace(tryPos, radius);
        if (!isBlockedAt(tryPos, radius, bodyHeight)) {
          pos.x = tryPos.x;
        }

        // Slide on Z axis.
        tryPos.copy(pos);
        tryPos.z += stepDelta.z;
        clampPositionInPlace(tryPos, radius);
        if (!isBlockedAt(tryPos, radius, bodyHeight)) {
          pos.z = tryPos.z;
        }
      }

      clampPositionInPlace(pos, radius);
      if (isBlockedAt(pos, radius, bodyHeight)) {
        return resolveBodyCollisions(pos, radius, bodyHeight);
      }
      return pos;
    },

    resolveBodyCollisions,

    resolveCollisions: (pos) => {
      return resolveBodyCollisions(pos, PLAYER_RADIUS, PLAYER_HEIGHT);
    },

    resolveCameraCollisions: (pos, radius = CAMERA_RADIUS, bodyHeight = CAMERA_HEIGHT) => {
      return resolveBodyCollisions(pos, radius, bodyHeight);
    },

    // Prevent TPV camera from crossing walls by sweeping from anchor to desired point.
    sweepCameraCollisions: (
      fromPos,
      toPos,
      radius = CAMERA_RADIUS,
      bodyHeight = CAMERA_HEIGHT,
    ) => {
      const start = tmpStart.copy(fromPos);
      const end = tmpEnd.copy(toPos);
      const candidate = tmpCandidate;
      const safe = tmpSafe.copy(start);

      // Keep points inside maze limits first.
      safe.x = clamp(
        safe.x,
        -mazeHalfWidth + cellSize + radius,
        mazeHalfWidth - cellSize - radius,
      );
      safe.z = clamp(
        safe.z,
        -mazeHalfHeight + cellSize + radius,
        mazeHalfHeight - cellSize - radius,
      );

      end.x = clamp(
        end.x,
        -mazeHalfWidth + cellSize + radius,
        mazeHalfWidth - cellSize - radius,
      );
      end.z = clamp(
        end.z,
        -mazeHalfHeight + cellSize + radius,
        mazeHalfHeight - cellSize - radius,
      );

      const steps = 24;
      for (let i = 1; i <= steps; i += 1) {
        const t = i / steps;
        candidate.lerpVectors(safe, end, t);

        if (isBlockedAt(candidate, radius, bodyHeight)) {
          break;
        }

        safe.copy(candidate);
      }

      toPos.copy(safe);
      return toPos;
    },

    getMazeSize: () => ({
      width: normalizedWidth,
      height: normalizedHeight,
      cellSize,
      centerX: -cellSize / 2,
      centerZ: -cellSize / 2,
    }),

    getSpawnPoint: () => ({
      x: (1 - normalizedWidth / 2) * cellSize,
      y: 0,
      z: (1 - normalizedHeight / 2) * cellSize,
    }),
    };
  }, [wallBoxes, cellSize, mazeHalfWidth, mazeHalfHeight, normalizedWidth, normalizedHeight]);

  React.useEffect(() => {
    if (onReady) onReady(collisionProvider);
  }, [collisionProvider, onReady]);

  return (
    <group>
      {wallBlocks.map((block) => {
        const sizeX = block.width * cellSize;
        const sizeZ = block.height * cellSize;
        const centerX = ((block.x + block.width / 2 - 0.5) - normalizedWidth / 2) * cellSize;
        const centerZ = ((block.y + block.height / 2 - 0.5) - normalizedHeight / 2) * cellSize;

        return (
          <Wall
            key={`${block.x}-${block.y}-${block.width}-${block.height}`}
            position={[centerX, WALL_HEIGHT / 2, centerZ]}
            size={[sizeX, WALL_HEIGHT, sizeZ]}
            color="#555"
          />
        );
      })}
    </group>
  );
}
