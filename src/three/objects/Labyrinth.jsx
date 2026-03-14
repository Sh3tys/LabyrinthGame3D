import React, { useMemo, useRef, useEffect } from "react";
import { ModuleFactory } from "./MazeModules.js";
import * as THREE from "three";

const WALL_HEIGHT = 4.5;
const PLAYER_RADIUS = 0.4;
const PLAYER_HEIGHT = 2.0;
const CAMERA_RADIUS = 0.25;
const CAMERA_HEIGHT = 0.8;
const WALL_THICKNESS = 1.0;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function keyFor(x, y) {
  return `${x},${y}`;
}

function shuffleInPlace(arr) {
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
}

/**
 * Maze generation using a graph (recursive-backtracking over cell nodes),
 * without constructing a binary matrix.
 */
function generateMazeGraph(cols, rows) {
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

function areLinked(links, ax, ay, bx, by) {
  const a = keyFor(ax, ay);
  const b = keyFor(bx, by);
  const neighbors = links.get(a);
  return neighbors ? neighbors.has(b) : false;
}

function buildWallCollisions(cols, rows, cellSize, wallThickness, links) {
  const cellPitch = cellSize;
  const wallSpan = cellPitch;
  const blocks = [];

  const cellCenterX = (x) => (x - (cols - 1) / 2) * cellPitch;
  const cellCenterZ = (y) => (y - (rows - 1) / 2) * cellPitch;

  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < cols; x += 1) {
      const cx = cellCenterX(x);
      const cz = cellCenterZ(y);

      // Outer ring walls, sauf ouverture à la sortie (bas droite)
      const isExit = (x === cols - 1 && y === rows - 1);
      // Mur OUEST
      if (x === 0) {
        blocks.push({
          position: [cx - cellSize / 2, WALL_HEIGHT / 2, cz],
          size: [wallThickness, WALL_HEIGHT, wallSpan],
        });
      }
      // Mur EST (sauf pour la sortie)
      if (x === cols - 1 && !(isExit)) {
        blocks.push({
          position: [cx + cellSize / 2, WALL_HEIGHT / 2, cz],
          size: [wallThickness, WALL_HEIGHT, wallSpan],
        });
      }
      // Mur NORD
      if (y === 0) {
        blocks.push({
          position: [cx, WALL_HEIGHT / 2, cz - cellSize / 2],
          size: [wallSpan, WALL_HEIGHT, wallThickness],
        });
      }
      // Mur SUD (sauf pour la sortie)
      if (y === rows - 1 && !(isExit)) {
        blocks.push({
          position: [cx, WALL_HEIGHT / 2, cz + cellSize / 2],
          size: [wallSpan, WALL_HEIGHT, wallThickness],
        });
      }
      // Pour la cellule de sortie, on retire aussi le mur EST et SUD
      // donc rien à ajouter ici pour isExit

      // Internal walls where no graph link exists
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

  return {
    blocks,
    cellPitch,
  };
}

export function Labyrinth({ width = 21, height = 21, cellSize = 2, onReady }) {
  // Graph-based generation uses cell counts directly.
  const cols = Math.max(5, width);
  const rows = Math.max(5, height);

  const mazeGraph = useMemo(() => generateMazeGraph(cols, rows), [cols, rows]);

  const mazeLayout = useMemo(() => {
    const mods = [];
    const cellPitch = cellSize;
    const cellCenterX = (x) => (x - (cols - 1) / 2) * cellPitch;
    const cellCenterZ = (y) => (y - (rows - 1) / 2) * cellPitch;

    for (let y = 0; y < rows; y += 1) {
      for (let x = 0; x < cols; x += 1) {
        const cx = cellCenterX(x);
        const cz = cellCenterZ(y);

        let top = y > 0 && areLinked(mazeGraph.links, x, y, x, y - 1);
        let right = x < cols - 1 && areLinked(mazeGraph.links, x, y, x + 1, y);
        let bottom = y < rows - 1 && areLinked(mazeGraph.links, x, y, x, y + 1);
        let left = x > 0 && areLinked(mazeGraph.links, x, y, x - 1, y);

        // Pour la cellule de sortie (bas droite), on force l'ouverture EST et SUD
        if (x === cols - 1 && y === rows - 1) {
          right = true;
          bottom = true;
        }

        const module = ModuleFactory.create(
          x,
          y,
          cx,
          cz,
          cellSize,
          WALL_HEIGHT,
          { top, right, bottom, left },
        );
        mods.push(module);
      }
    }
    return { modules: mods, cellPitch };
  }, [cols, rows, cellSize, mazeGraph.links]);

  const wallLayout = useMemo(
    () => buildWallCollisions(cols, rows, cellSize, 0.4, mazeGraph.links),
    [cols, rows, cellSize, mazeGraph.links],
  );

  const wallBlocks = wallLayout.blocks;
  const cellPitch = mazeLayout.cellPitch;

  const walkHalfWidth = ((cols - 1) * cellPitch) / 2 + cellSize / 2;
  const walkHalfHeight = ((rows - 1) * cellPitch) / 2 + cellSize / 2;

  // Collisions from wall blocks.
  const wallBoxes = useMemo(() => {
    const boxes = [];
    wallBlocks.forEach((block) => {
      const [px, py, pz] = block.position;
      const [sx, sy, sz] = block.size;
      const minX = px - sx / 2;
      const minZ = pz - sz / 2;
      const maxX = px + sx / 2;
      const maxZ = pz + sz / 2;

      boxes.push(
        new THREE.Box3(
          new THREE.Vector3(minX, py - sy / 2, minZ),
          new THREE.Vector3(maxX, py + sy / 2, maxZ),
        ),
      );
    });
    return boxes;
  }, [wallBlocks]);

  const collisionProvider = useMemo(() => {
    const tmpStepDelta = new THREE.Vector3();
    const tmpTryPos = new THREE.Vector3();
    const tmpStart = new THREE.Vector3();
    const tmpEnd = new THREE.Vector3();
    const tmpCandidate = new THREE.Vector3();
    const tmpSafe = new THREE.Vector3();

    const clampPositionInPlace = (pos, radius = PLAYER_RADIUS) => {
      pos.x = clamp(pos.x, -walkHalfWidth + radius, walkHalfWidth - radius);
      pos.z = clamp(pos.z, -walkHalfHeight + radius, walkHalfHeight - radius);
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

    const isBlockedAt = (
      pos,
      radius = PLAYER_RADIUS,
      bodyHeight = PLAYER_HEIGHT,
    ) => {
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

          const overlapX = Math.min(
            bodyBox.max.x - wall.min.x,
            wall.max.x - bodyBox.min.x,
          );
          const overlapZ = Math.min(
            bodyBox.max.z - wall.min.z,
            wall.max.z - bodyBox.min.z,
          );

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

      resolveCameraCollisions: (
        pos,
        radius = CAMERA_RADIUS,
        bodyHeight = CAMERA_HEIGHT,
      ) => {
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
        safe.x = clamp(safe.x, -walkHalfWidth + radius, walkHalfWidth - radius);
        safe.z = clamp(
          safe.z,
          -walkHalfHeight + radius,
          walkHalfHeight - radius,
        );

        end.x = clamp(end.x, -walkHalfWidth + radius, walkHalfWidth - radius);
        end.z = clamp(end.z, -walkHalfHeight + radius, walkHalfHeight - radius);

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
        width: cols,
        height: rows,
        cellSize: cellPitch,
        centerX: 0,
        centerZ: 0,
        worldWidth: walkHalfWidth * 2,
        worldHeight: walkHalfHeight * 2,
      }),

      getSpawnPoint: () => ({
        x: (mazeGraph.startCell.x - (cols - 1) / 2) * cellPitch,
        y: 0,
        z: (mazeGraph.startCell.y - (rows - 1) / 2) * cellPitch,
      }),
      getExitPoint: () => ({
        x: (mazeGraph.exitCell.x - (cols - 1) / 2) * cellPitch,
        y: 0,
        z: (mazeGraph.exitCell.y - (rows - 1) / 2) * cellPitch,
      }),
    };
  }, [
    wallBoxes,
    cols,
    rows,
    cellPitch,
    walkHalfWidth,
    walkHalfHeight,
    mazeGraph.startCell.x,
    mazeGraph.startCell.y,
  ]);

  React.useEffect(() => {
    if (onReady) onReady(collisionProvider);
  }, [collisionProvider, onReady]);

  const meshRef = useRef();

  const geometry = useMemo(() => new THREE.PlaneGeometry(1, 1), []);

  const material = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#555",
        side: THREE.FrontSide,
        roughness: 0.8,
        metalness: 0.2,
      }),
    [],
  );

  const allFaces = useMemo(() => {
    const faces = [];

    mazeLayout.modules.forEach((mod) => {
      const moduleFaces = mod.getFaces();

      moduleFaces.forEach((face) => {
        faces.push({
          position: face.position,
          rotation: face.rotation,
          size: face.size,
          modulePosition: [mod.px, 0, mod.pz],
        });
      });
    });

    return faces;
  }, [mazeLayout.modules]);

  useEffect(() => {
    if (!meshRef.current) return;

    const mesh = meshRef.current;
    const dummy = new THREE.Object3D();

    allFaces.forEach((face, i) => {
      dummy.position.set(
        face.modulePosition[0] + face.position[0],
        face.position[1],
        face.modulePosition[2] + face.position[2],
      );

      dummy.rotation.set(face.rotation[0], face.rotation[1], face.rotation[2]);

      dummy.scale.set(face.size[0], face.size[1], 1);

      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });

    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [allFaces]);

  return (
    <group>
      <instancedMesh
        ref={meshRef}
        args={[geometry, material, allFaces.length]}
        frustumCulled={false}
        castShadow
        receiveShadow
      />
    </group>
  );
}
