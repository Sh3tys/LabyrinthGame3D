import * as THREE from 'three';

/**
 * Functional Requirement: 5-Type Cube Module Generator (OOP)
 * The system generates cubes where specific lateral faces can be removed.
 * 
 * Top Face Specification:
 * Inverted backface culling implemented by creating a plane that faces DOWN (-y).
 * Since its normal points inwardly, it evaluates to visible from inside. 
 * From the outside (top-down view), the normal points away from the camera, 
 * making it completely transparent (culled).
 */

export class MazeGeneratorOOP {
  /**
   * Generates the essential face geometries for a module.
   * @param {Object} connections - { top, right, bottom, left }: true if path exists (wall removed).
   * @param {number} cellSize - Width/Depth of the cell
   * @param {number} height - Height of the cell walls
   * @returns {Array} Array of face objects required to render the module
   */
  static getFaces(connections, cellSize, height) {
    const hw = cellSize / 2;
    const hh = height / 2;
    const faces = [];

    // 1. Floor — horizontal plane at y = 0.01 (slight offset to avoid z-fighting)
    faces.push({
      key: 'floor',
      type: 'floor',
      position: [0, 0.01, 0],
      rotation: [-Math.PI / 2, 0, 0], // Normal +Y (faces up)
      size: [cellSize, cellSize],
    });

    // 2. Ceiling — faces downward so it's visible from inside
    faces.push({
      key: 'ceiling',
      type: 'ceiling',
      position: [0, height, 0],
      rotation: [Math.PI / 2, 0, 0],
      size: [cellSize, cellSize],
    });

    // 3. Walls — only where there is NO connection (passage)
    // Top/North (z - 1)
    if (!connections.top) {
      faces.push({
        key: 'wall_top',
        type: 'wall',
        position: [0, hh, -hw],
        rotation: [0, 0, 0], // Normal +Z
        size: [cellSize, height],
      });
    }
    // Right/East (x + 1)
    if (!connections.right) {
      faces.push({
        key: 'wall_right',
        type: 'wall',
        position: [hw, hh, 0],
        rotation: [0, -Math.PI / 2, 0], // Normal -X
        size: [cellSize, height],
      });
    }
    // Bottom/South (z + 1)
    if (!connections.bottom) {
      faces.push({
        key: 'wall_bottom',
        type: 'wall',
        position: [0, hh, hw],
        rotation: [0, Math.PI, 0], // Normal -Z
        size: [cellSize, height],
      });
    }
    // Left/West (x - 1)
    if (!connections.left) {
      faces.push({
        key: 'wall_left',
        type: 'wall',
        position: [-hw, hh, 0],
        rotation: [0, Math.PI / 2, 0], // Normal +X
        size: [cellSize, height],
      });
    }

    return faces;
  }
}

/** Base class for a Maze Module */
export class MazeModule {
  constructor(x, y, px, pz, cellSize, height, connections) {
    this.x = x;          // Grid coordinate X
    this.y = y;          // Grid coordinate Y (Z in 3D)
    this.px = px;        // World position X
    this.pz = pz;        // World position Z
    this.cellSize = cellSize;
    this.height = height;
    this.connections = connections;
  }

  getFaces() {
    return MazeGeneratorOOP.getFaces(this.connections, this.cellSize, this.height);
  }

  getModuleName() {
    return "Base Module";
  }
}

/** Type 1 (Solid): All 4 side faces present (Dead-end block) */
export class SolidModule extends MazeModule {
  getModuleName() { return "Type 1 (Solid)"; }
}

/** Type 2 (Exit): 1 side face removed (Entry/Exit / Dead-end path) */
export class ExitModule extends MazeModule {
  getModuleName() { return "Type 2 (Exit)"; }
}

/** Type 3 (Corner): 2 adjacent side faces removed (90° turn) */
export class CornerModule extends MazeModule {
  getModuleName() { return "Type 3 (Corner)"; }
}

/** Type 4 (Tunnel): 2 opposite side faces removed (Straight path) */
export class TunnelModule extends MazeModule {
  getModuleName() { return "Type 4 (Tunnel)"; }
}

/** Type 5 (T-Junction): 3 side faces removed. */
export class TJunctionModule extends MazeModule {
  getModuleName() { return "Type 5 (T-Junction)"; }
}

/** Optional Type 6 (Intersection): All 4 side faces removed. */
export class IntersectionModule extends MazeModule {
  getModuleName() { return "Type 6 (Intersection)"; }
}

/**
 * Factory class to instantiate the correct Module derived class
 * based on neighbor connectivity count and configuration.
 */
export class ModuleFactory {
  static create(x, y, px, pz, cellSize, height, connections) {
    const { top, right, bottom, left } = connections;
    const openCount = [top, right, bottom, left].filter(Boolean).length;

    switch (openCount) {
      case 0:
        return new SolidModule(x, y, px, pz, cellSize, height, connections);
      case 1:
        return new ExitModule(x, y, px, pz, cellSize, height, connections);
      case 2:
        // Check if opposite faces are open for a Tunnel
        if ((top && bottom) || (left && right)) {
          return new TunnelModule(x, y, px, pz, cellSize, height, connections);
        }
        // Otherwise, it's adjacent, so it's a corner
        return new CornerModule(x, y, px, pz, cellSize, height, connections);
      case 3:
        return new TJunctionModule(x, y, px, pz, cellSize, height, connections);
      case 4:
        return new IntersectionModule(x, y, px, pz, cellSize, height, connections);
      default:
        // Fallback safety
        return new SolidModule(x, y, px, pz, cellSize, height, connections);
    }
  }
}
