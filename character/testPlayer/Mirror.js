import * as THREE from 'three';
import { Reflector } from 'three/examples/jsm/objects/Reflector.js';

/**
 * Mirror — miroir réfléchissant sur le mur nord.
 * Utilise three/examples Reflector (rendu dans un RenderTarget).
 * En mode TPV le joueur peut se voir dedans.
 */
export class Mirror {
  static W = 4;    // largeur du miroir
  static H = 3;    // hauteur du miroir
  // Position : mur nord interne à z = -(ROOM_HALF - WALL_THICKNESS/2) = -9.75
  // On place le miroir légèrement devant : z = -9.73
  static Z = -9.73;
  static Y = 2.0;  // centre vertical

  #reflector;
  #frames = [];
  #scene;

  constructor(scene) {
    this.#scene = scene;
    this._build();
  }

  // ── Private ────────────────────────────────────────────────────────────────

  _build() {
    const W = Mirror.W;
    const H = Mirror.H;
    const pos = new THREE.Vector3(0, Mirror.Y, Mirror.Z);

    // ── Reflector (surface réfléchissante) ───────────────────────────────────
    // PlaneGeometry : normale = +Z ↔ face vers la salle (player vient de +Z)
    this.#reflector = new Reflector(new THREE.PlaneGeometry(W, H), {
      clipBias      : 0.003,
      textureWidth  : 1024,
      textureHeight : 1024,
      color         : new THREE.Color(0xbbccbb),
    });
    this.#reflector.position.copy(pos);
    this.#scene.add(this.#reflector);

    // ── Cadre métallique ─────────────────────────────────────────────────────
    const frameMat = new THREE.MeshStandardMaterial({
      color    : 0xc0c0d0,
      metalness: 0.95,
      roughness: 0.05,
    });
    const thick = 0.1;
    const depth = 0.12;
    // [dx, dy, sx, sy]
    const parts = [
      [0,          H/2+thick/2, W+thick*2, thick],  // haut
      [0,         -H/2-thick/2, W+thick*2, thick],  // bas
      [-W/2-thick/2, 0,   thick, H],                // gauche
      [ W/2+thick/2, 0,   thick, H],                // droite
    ];
    for (const [dx, dy, sx, sy] of parts) {
      const m = new THREE.Mesh(
        new THREE.BoxGeometry(sx, sy, depth),
        frameMat,
      );
      m.position.set(pos.x + dx, pos.y + dy, pos.z + depth/2);
      this.#scene.add(m);
      this.#frames.push(m);
    }

    // ── Panneau arrière (masque le void derrière le miroir) ──────────────────
    const back = new THREE.Mesh(
      new THREE.PlaneGeometry(W, H),
      new THREE.MeshStandardMaterial({ color: 0x111122, roughness: 1 }),
    );
    back.position.set(pos.x, pos.y, pos.z - 0.01);
    back.rotation.y = Math.PI; // face opposée
    this.#scene.add(back);
    this.#frames.push(back);
  }

  // ── Public API ────────────────────────────────────────────────────────────

  dispose() {
    this.#scene.remove(this.#reflector);
    this.#reflector.geometry.dispose();
    for (const m of this.#frames) {
      this.#scene.remove(m);
      m.geometry.dispose();
      m.material.dispose();
    }
  }
}
