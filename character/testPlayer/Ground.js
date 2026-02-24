import * as THREE from 'three';

/**
 * Ground
 * ------
 * Sol de test (plan) sur lequel le joueur peut marcher.
 * Suffisamment grand pour tester les déplacements.
 */
export class Ground {
  // ─── Constants ─────────────────────────────────────────────────────────────

  /** Taille de la grille de test (unités Three.js) */
  static SIZE = 100;

  /** Couleur du damier A */
  static COLOR_A = 0x2a2a3a;

  /** Couleur du damier B */
  static COLOR_B = 0x1a1a2a;

  // ─── Attributes ────────────────────────────────────────────────────────────

  /** @type {THREE.Mesh} - le plan visible */
  #mesh;

  /**
   * @param {THREE.Scene} scene - la scène Three.js
   */
  constructor(scene) {
    this._scene = scene;
    this.#mesh = this._createMesh();
    scene.add(this.#mesh);
  }

  // ─── Private methods ───────────────────────────────────────────────────────

  /**
   * Crée le mesh du sol avec une texture damier procédurale.
   * @returns {THREE.Mesh}
   */
  _createMesh() {
    const geometry = new THREE.PlaneGeometry(Ground.SIZE, Ground.SIZE, 50, 50);
    const texture = this._createCheckerTexture(64);

    const material = new THREE.MeshStandardMaterial({
      map: texture,
      roughness: 0.6,
      metalness: 0.4,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.x = -Math.PI / 2; // Plan horizontal
    mesh.position.y = 0;
    mesh.receiveShadow = true;
    mesh.name = 'Ground';

    return mesh;
  }

  /**
   * Génère une texture damier sur un canvas 2D (pas de fichier externe).
   * @param {number} tileCount - nombre de tuiles
   * @returns {THREE.CanvasTexture}
   */
  _createCheckerTexture(tileCount) {
    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    const tileSize = size / tileCount;

    for (let row = 0; row < tileCount; row++) {
      for (let col = 0; col < tileCount; col++) {
        const isLight = (row + col) % 2 === 0;
        ctx.fillStyle = isLight ? '#0d0d26' : '#050514';
        ctx.fillRect(col * tileSize, row * tileSize, tileSize, tileSize);
      }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(8, 8);

    return texture;
  }

  // ─── Public API ────────────────────────────────────────────────────────────

  /** @returns {THREE.Mesh} */
  get mesh() { return this.#mesh; }

  /** @returns {number} - position Y du sol */
  get y() { return this.#mesh.position.y; }

  /** Supprime le sol de la scène */
  dispose() {
    this._scene.remove(this.#mesh);
    this.#mesh.geometry.dispose();
    this.#mesh.material.dispose();
  }
}
