import React, { useMemo, useRef, useEffect } from "react";
import { ModuleFactory } from "./MazeModules.js";
import * as THREE from "three";

const WALL_HEIGHT = 2.5;
const PLAYER_RADIUS = 0.4;
const PLAYER_HEIGHT = 1.75;
const CAMERA_RADIUS = 0.25;
const CAMERA_HEIGHT = 0.8;
const WALL_THICKNESS = 1.0;

// ─── Texture paths ────────────────────────────────────────────
const WALL_TEXTURES = {
  map: "/texture/wall/Stone Path 002_Albedo.jpg",
  aoMap: "/texture/wall/Stone Path 002_AO.jpg",
  normalMap: "/texture/wall/Stone Path 002_Normal.jpg",
  roughnessMap: "/texture/wall/Stone Path 002_Roughness.jpg",
  displacementMap: "/texture/wall/Stone Path 002_Displacement.png",
};

const FLOOR_TEXTURES = {
  map: "/texture/ground/Ground_Wet_002_basecolor.jpg",
  aoMap: "/texture/ground/Ground_Wet_002_ambientOcclusion.jpg",
  normalMap: "/texture/ground/Ground_Wet_002_normal.jpg",
  roughnessMap: "/texture/ground/Ground_Wet_002_roughness.jpg",
  displacementMap: "/texture/ground/Ground_Wet_002_mask.jpg",
};

const CEILING_TEXTURES = {
  map: "/texture/roof/Jungle_Floor_001_basecolor.jpg",
  aoMap: "/texture/roof/Jungle_Floor_001_ambientOcclusion.jpg",
  normalMap: "/texture/roof/Jungle_Floor_001_normal.jpg",
  roughnessMap: "/texture/roof/Jungle_Floor_001_roughness.jpg",
  displacementMap: "/texture/roof/Jungle_Floor_001_height.png",
};

// ─── Texture loader singleton ─────────────────────────────────
const textureLoader = new THREE.TextureLoader();

function loadTexture(path, repeat = [1, 1]) {
  const tex = textureLoader.load(path);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeat[0], repeat[1]);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function loadLinearTexture(path, repeat = [1, 1]) {
  const tex = textureLoader.load(path);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeat[0], repeat[1]);
  // linear textures (normal, roughness, ao, displacement) must NOT be sRGB
  return tex;
}

function buildTexturedMaterial(texDefs, repeatXY, options = {}) {
  const r = repeatXY;
  const mat = new THREE.MeshStandardMaterial({
    map: loadTexture(texDefs.map, r),
    aoMap: loadLinearTexture(texDefs.aoMap, r),
    normalMap: loadLinearTexture(texDefs.normalMap, r),
    roughnessMap: loadLinearTexture(texDefs.roughnessMap, r),
    // displacement is expensive on instanced meshes — skip by default
    roughness: 0.85,
    metalness: 0.02,
    side: THREE.FrontSide,
    ...options,
  });
  return mat;
}

// ─── Utilities ────────────────────────────────────────────────

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

// ─── Maze generation ─────────────────────────────────────────

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

// ─── Labyrinth component ──────────────────────────────────────

export function Labyrinth({ width = 21, height = 21, cellSize = 2, onReady }) {
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

  // ── Collision boxes ──────────────────────────────────────────
  const wallBoxes = useMemo(() => {
    return wallBlocks.map((block) => {
      const [px, py, pz] = block.position;
      const [sx, sy, sz] = block.size;
      return new THREE.Box3(
        new THREE.Vector3(px - sx / 2, py - sy / 2, pz - sz / 2),
        new THREE.Vector3(px + sx / 2, py + sy / 2, pz + sz / 2),
      );
    });
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

    const makeBodyBox = (pos, radius, bodyHeight) =>
      new THREE.Box3(
        new THREE.Vector3(pos.x - radius, 0, pos.z - radius),
        new THREE.Vector3(pos.x + radius, bodyHeight, pos.z + radius),
      );

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
      clampPositionInPlace(pos, radius);
      const bodyBox = makeBodyBox(pos, radius, bodyHeight);

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
      clampPosition: (pos, radius = PLAYER_RADIUS) =>
        clampPositionInPlace(pos, radius),

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
          tryPos.copy(pos).add(stepDelta);
          clampPositionInPlace(tryPos, radius);

          if (!isBlockedAt(tryPos, radius, bodyHeight)) {
            pos.copy(tryPos);
            continue;
          }

          tryPos.copy(pos);
          tryPos.x += stepDelta.x;
          clampPositionInPlace(tryPos, radius);
          if (!isBlockedAt(tryPos, radius, bodyHeight)) pos.x = tryPos.x;

          tryPos.copy(pos);
          tryPos.z += stepDelta.z;
          clampPositionInPlace(tryPos, radius);
          if (!isBlockedAt(tryPos, radius, bodyHeight)) pos.z = tryPos.z;
        }

        clampPositionInPlace(pos, radius);
        if (isBlockedAt(pos, radius, bodyHeight)) {
          return resolveBodyCollisions(pos, radius, bodyHeight);
        }
        return pos;
      },

      resolveBodyCollisions,
      resolveCollisions: (pos) =>
        resolveBodyCollisions(pos, PLAYER_RADIUS, PLAYER_HEIGHT),
      resolveCameraCollisions: (
        pos,
        radius = CAMERA_RADIUS,
        bodyHeight = CAMERA_HEIGHT,
      ) => resolveBodyCollisions(pos, radius, bodyHeight),

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
          if (isBlockedAt(candidate, radius, bodyHeight)) break;
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
    mazeGraph.exitCell.x,
    mazeGraph.exitCell.y,
  ]);

  React.useEffect(() => {
    if (onReady) onReady(collisionProvider);
  }, [collisionProvider, onReady]);

  // ── Geometry & Materials ──────────────────────────────────────
  const geometry = useMemo(() => {
    const g = new THREE.PlaneGeometry(1, 1);
    // Add uv2 for aoMap (same as uv)
    g.setAttribute("uv2", g.attributes.uv.clone());
    return g;
  }, []);

  // Build materials lazily once (they are stable refs across renders)
  const wallMaterial = useMemo(
    () =>
      buildTexturedMaterial(WALL_TEXTURES, [cellSize * 0.3, WALL_HEIGHT * 0.3]),
    [cellSize],
  );
  const floorMaterial = useMemo(
    () => buildTexturedMaterial(FLOOR_TEXTURES, [cellSize, cellSize]),
    [cellSize],
  );
  const ceilingMaterial = useMemo(
    () => buildTexturedMaterial(CEILING_TEXTURES, [cellSize, cellSize]),
    [cellSize],
  );

  // ── Sort faces by type ────────────────────────────────────────
  const { wallFaces, floorFaces, ceilingFaces } = useMemo(() => {
    const wallF = [];
    const floorF = [];
    const ceilF = [];

    mazeLayout.modules.forEach((mod) => {
      mod.getFaces().forEach((face) => {
        const entry = {
          position: face.position,
          rotation: face.rotation,
          size: face.size,
          modulePosition: [mod.px, 0, mod.pz],
        };
        if (face.type === "ceiling") {
          ceilF.push(entry);
        } else if (face.type === "floor") {
          floorF.push(entry);
        } else {
          wallF.push(entry);
        }
      });
    });

    return { wallFaces: wallF, floorFaces: floorF, ceilingFaces: ceilF };
  }, [mazeLayout.modules]);

  // ── Instanced mesh refs ───────────────────────────────────────
  const wallMeshRef = useRef();
  const floorMeshRef = useRef();
  const ceilingMeshRef = useRef();

  // Helper to apply matrices
  const applyInstances = (meshRef, faces) => {
    if (!meshRef.current) return;
    const mesh = meshRef.current;
    const dummy = new THREE.Object3D();

    faces.forEach((face, i) => {
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
  };

  useEffect(() => applyInstances(wallMeshRef, wallFaces), [wallFaces]);
  useEffect(() => applyInstances(floorMeshRef, floorFaces), [floorFaces]);
  useEffect(() => applyInstances(ceilingMeshRef, ceilingFaces), [ceilingFaces]);

  return (
    <group>
      {/* Walls */}
      {wallFaces.length > 0 && (
        <instancedMesh
          ref={wallMeshRef}
          args={[geometry, wallMaterial, wallFaces.length]}
          frustumCulled={false}
          castShadow
          receiveShadow
        />
      )}

      {/* Floor tiles */}
      {floorFaces.length > 0 && (
        <instancedMesh
          ref={floorMeshRef}
          args={[geometry, floorMaterial, floorFaces.length]}
          frustumCulled={false}
          receiveShadow
        />
      )}

      {/* Ceiling */}
      {ceilingFaces.length > 0 && (
        <instancedMesh
          ref={ceilingMeshRef}
          args={[geometry, ceilingMaterial, ceilingFaces.length]}
          frustumCulled={false}
          castShadow
          receiveShadow
        />
      )}
    </group>
  );
}
