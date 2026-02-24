import * as THREE from 'three';

/**
 * Walls — salle de test avec 4 murs et collision joueur.
 */
export class Walls {
  static ROOM_HALF      = 10;   // demi-taille de la salle (20×20 u)
  static WALL_HEIGHT    = 4;
  static WALL_THICKNESS = 0.5;
  static PLAYER_RADIUS  = 0.35; // rayon de collision du joueur

  #colliders = []; // { minX, maxX, minZ, maxZ }
  #meshes    = [];
  #scene;

  constructor(scene) {
    this.#scene = scene;
    this._build();
  }

  // ── Private ────────────────────────────────────────────────────────────────

  _build() {
    const R = Walls.ROOM_HALF;
    const H = Walls.WALL_HEIGHT;
    const T = Walls.WALL_THICKNESS;

    // Texture damier pour les murs
    const tex = this._makeTileTexture();
    const mat = new THREE.MeshStandardMaterial({
      map      : tex,
      color    : 0xaabbcc,
      roughness: 0.8,
      metalness: 0.1,
    });

    // [cx, cy, cz, sx, sy, sz]
    const defs = [
      [0,  H/2, -R, R*2+T, H,   T], // Nord
      [0,  H/2,  R, R*2+T, H,   T], // Sud
      [-R, H/2,  0, T,     H, R*2], // Ouest
      [R,  H/2,  0, T,     H, R*2], // Est
    ];

    for (const [cx, cy, cz, sx, sy, sz] of defs) {
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(sx, sy, sz),
        mat.clone(),
      );
      mesh.position.set(cx, cy, cz);
      mesh.receiveShadow = true;
      this.#scene.add(mesh);
      this.#meshes.push(mesh);
      this.#colliders.push({ minX: cx-sx/2, maxX: cx+sx/2, minZ: cz-sz/2, maxZ: cz+sz/2 });
    }
  }

  _makeTileTexture() {
    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#050510';
    ctx.fillRect(0, 0, size, size);
    // grille de panneaux
    ctx.strokeStyle = '#4e7bff';
    ctx.lineWidth = 4;
    const tiles = 4;
    for (let i = 0; i <= tiles; i++) {
      const p = (size / tiles) * i;
      ctx.beginPath(); ctx.moveTo(p, 0); ctx.lineTo(p, size); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, p); ctx.lineTo(size, p); ctx.stroke();
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(3, 1);
    return tex;
  }

  // ── Public API ────────────────────────────────────────────────────────────

  /**
   * Résolution collision cercle (joueur) ↔ AABB (mur) en plan XZ.
   * @param {THREE.Vector3} position — modifiée en place
   */
  resolveCollisions(position) {
    const r = Walls.PLAYER_RADIUS;
    for (const b of this.#colliders) {
      const nearX = Math.max(b.minX, Math.min(b.maxX, position.x));
      const nearZ = Math.max(b.minZ, Math.min(b.maxZ, position.z));
      const dx = position.x - nearX;
      const dz = position.z - nearZ;
      const d2 = dx*dx + dz*dz;
      if (d2 > 0 && d2 < r*r) {
        const d   = Math.sqrt(d2);
        const pen = r - d;
        position.x += (dx/d) * pen;
        position.z += (dz/d) * pen;
      } else if (d2 === 0) {
        position.x += r; // sécurité
      }
    }
  }

  /** @returns {number} demi-taille de la salle */
  get roomHalf() { return Walls.ROOM_HALF; }

  dispose() {
    for (const m of this.#meshes) {
      this.#scene.remove(m);
      m.geometry.dispose();
      m.material.dispose();
    }
  }
}
