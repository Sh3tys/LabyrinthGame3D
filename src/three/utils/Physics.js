import * as THREE from 'three';

/**
 * Physics
 * -------
 * Gère la physique du joueur : gravité, saut et collision avec le sol.
 * Physique simplifiée (pas de moteur externe) — parfaite pour un prototype.
 */
export class Physics {
  // ─── Constants ─────────────────────────────────────────────────────────────

  /** Accélération gravitationnelle (unités/s²) */
  static GRAVITY = -20;

  /** Force de saut initiale (unités/s) */
  static JUMP_FORCE = 8;

  /** Hauteur minimale des pieds du joueur au-dessus du sol */
  static GROUND_HEIGHT = 0;

  // ─── Attributes ────────────────────────────────────────────────────────────

  /** @type {THREE.Vector3} - vitesse verticale courante */
  #velocity;

  /** @type {boolean} - true si le joueur touche le sol */
  #onGround;

  /** @type {boolean} - space a été pressé ce frame */
  #jumpPressed = false;

  constructor() {
    this.#velocity = new THREE.Vector3(0, 0, 0);
    this.#onGround = false;
  }

  // ─── Public API ────────────────────────────────────────────────────────────

  /** @returns {boolean} */
  get onGround() { return this.#onGround; }

  /** @returns {THREE.Vector3} vitesse courante (lecture seule — clonée) */
  get velocity() { return this.#velocity.clone(); }

  /**
   * Notifie que le bouton de saut vient d'être pressé.
   */
  requestJump() {
    if (this.#onGround) {
      this.#velocity.y = Physics.JUMP_FORCE;
      this.#onGround = false;
      return true;
    }
    return false;
  }

  /**
   * Met à jour la physique et déplace la position du joueur en conséquence.
   *
   * @param {THREE.Vector3} position     - position actuelle du joueur (modifiée en place)
   * @param {number}        deltaTime    - temps écoulé depuis le dernier frame (secondes)
   */
  update(position, deltaTime) {
    // Appliquer la gravité si le joueur n'est pas au sol
    if (!this.#onGround) {
      this.#velocity.y += Physics.GRAVITY * deltaTime;
    }

    // Déplacer verticalement
    position.y += this.#velocity.y * deltaTime;

    // ─── Collision avec le sol ──────────────────────────────────────────────
    if (position.y <= Physics.GROUND_HEIGHT) {
      position.y = Physics.GROUND_HEIGHT;
      this.#velocity.y = 0;
      this.#onGround = true;
    } else {
      this.#onGround = false;
    }
  }

  /**
   * Réinitialise la physique (utile si on teleporte le joueur).
   */
  reset() {
    this.#velocity.set(0, 0, 0);
    this.#onGround = false;
  }
}
