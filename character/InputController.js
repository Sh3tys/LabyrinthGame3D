/**
 * InputController
 * ---------------
 * Gère les entrées clavier du joueur (ZQSD + Espace + souris).
 * Utilise un pattern OOP avec des accesseurs clairs.
 */
export class InputController {
  /** @type {Set<string>} - touches actuellement pressées */
  #keys = new Set();

  /** @type {boolean} - indique si le pointeur est verrouillé */
  #pointerLocked = false;

  /** @type {number} - delta X de la souris ce frame */
  #mouseDeltaX = 0;

  /** @type {number} - delta Y de la souris ce frame */
  #mouseDeltaY = 0;

  /** @type {boolean} - true une seule fois par appui sur V */
  #viewTogglePending = false;

  /**
   * @param {HTMLElement} domElement - l'élément sur lequel écouter les events
   */
  constructor(domElement) {
    this._domElement = domElement;

    this._onKeyDown = this._onKeyDown.bind(this);
    this._onKeyUp = this._onKeyUp.bind(this);
    this._onMouseMove = this._onMouseMove.bind(this);
    this._onPointerLockChange = this._onPointerLockChange.bind(this);
    this._onPointerLockError = this._onPointerLockError.bind(this);

    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);
    document.addEventListener('mousemove', this._onMouseMove);
    document.addEventListener('pointerlockchange', this._onPointerLockChange);
    document.addEventListener('pointerlockerror', this._onPointerLockError);

    // Clic sur le canvas pour capturer la souris
    domElement.addEventListener('click', () => {
      domElement.requestPointerLock();
    });
  }

  // ─── Private event handlers ────────────────────────────────────────────────

  _onKeyDown(event) {
    this.#keys.add(event.code);
    if (event.code === 'KeyV') this.#viewTogglePending = true;
  }

  _onKeyUp(event) {
    this.#keys.delete(event.code);
  }

  _onMouseMove(event) {
    if (this.#pointerLocked) {
      this.#mouseDeltaX += event.movementX;
      this.#mouseDeltaY += event.movementY;
    }
  }

  _onPointerLockChange() {
    this.#pointerLocked = document.pointerLockElement === this._domElement;
  }

  _onPointerLockError() {
    console.warn('[InputController] Pointer lock error');
  }

  // ─── Public API ────────────────────────────────────────────────────────────

  /** @returns {boolean} true si la touche avant (Z) est pressée */
  get forward() { return this.#keys.has('KeyZ') || this.#keys.has('KeyW'); }

  /** @returns {boolean} true si la touche arrière (S) est pressée */
  get backward() { return this.#keys.has('KeyS'); }

  /** @returns {boolean} true si strafe gauche (Q) est pressé */
  get left() { return this.#keys.has('KeyQ') || this.#keys.has('KeyA'); }

  /** @returns {boolean} true si strafe droite (D) est pressé */
  get right() { return this.#keys.has('KeyD'); }

  /** @returns {boolean} true si Espace est pressé */
  get jump() { return this.#keys.has('Space'); }

  /** @returns {boolean} true si le joueur se déplace */
  get isMoving() {
    return this.forward || this.backward || this.left || this.right;
  }

  /** @returns {boolean} true si Shift est pressé pour courir */
  get run() { return this.#keys.has('ShiftLeft') || this.#keys.has('ShiftRight'); }

  /** @returns {boolean} true si le pointeur est verrouillé */
  get isPointerLocked() { return this.#pointerLocked; }

  /**
   * Retourne true UNE SEULE FOIS par appui sur V (edge-triggered).
   * @returns {boolean}
   */
  consumeViewToggle() {
    const v = this.#viewTogglePending;
    this.#viewTogglePending = false;
    return v;
  }

  /**
   * Récupère et réinitialise le delta souris de ce frame.
   * @returns {{ x: number, y: number }}
   */
  consumeMouseDelta() {
    const delta = { x: this.#mouseDeltaX, y: this.#mouseDeltaY };
    this.#mouseDeltaX = 0;
    this.#mouseDeltaY = 0;
    return delta;
  }

  /** Nettoyage : supprime les event listeners */
  dispose() {
    window.removeEventListener('keydown', this._onKeyDown);
    window.removeEventListener('keyup', this._onKeyUp);
    document.removeEventListener('mousemove', this._onMouseMove);
    document.removeEventListener('pointerlockchange', this._onPointerLockChange);
    document.removeEventListener('pointerlockerror', this._onPointerLockError);
  }
}
