import * as THREE from "three";

/**
 * InputController
 * ---------------
 * Handles keyboard (ZQSD / WASD) and mouse input for the player.
 * Click on the canvas to lock the pointer for FPS-style mouse look.
 * Press V to toggle between first-person and third-person view.
 */
export class InputController {
  constructor(domElement) {
    this.domElement = domElement;
    this.keys = new Set();
    this.pointerLocked = false;
    this.pointerLockEnabled = true;
    this.mouseDX = 0;
    this.mouseDY = 0;
    this.viewTogglePending = false;
    this.topDownTogglePending = false;

    // Bind event handlers
    this._onKeyDown = (e) => {
      this.keys.add(e.code);
      if (e.code === "KeyV") this.viewTogglePending = true;
      if (e.code === "KeyE") this.topDownTogglePending = true;
    };

    this._onKeyUp = (e) => {
      this.keys.delete(e.code);
    };

    this._onMouseMove = (e) => {
      if (this.pointerLocked) {
        this.mouseDX += e.movementX;
        this.mouseDY += e.movementY;
      }
    };

    this._onPointerLockChange = () => {
      this.pointerLocked = document.pointerLockElement === domElement;
    };

    // Attach listeners
    window.addEventListener("keydown", this._onKeyDown);
    window.addEventListener("keyup", this._onKeyUp);
    document.addEventListener("mousemove", this._onMouseMove);
    document.addEventListener("pointerlockchange", this._onPointerLockChange);

    // Click canvas to lock pointer
    this._onClick = () => {
      if (this.pointerLockEnabled) {
        domElement.requestPointerLock();
      }
    };
    domElement.addEventListener("click", this._onClick);
  }

  // ── Direction getters (AZERTY + QWERTY) ───────────────────

  get forward() {
    return this.keys.has("KeyW") || this.keys.has("KeyZ");
  }

  get backward() {
    return this.keys.has("KeyS");
  }

  get left() {
    return this.keys.has("KeyA") || this.keys.has("KeyQ");
  }

  get right() {
    return this.keys.has("KeyD");
  }

  get isMoving() {
    return this.forward || this.backward || this.left || this.right;
  }

  // ── One-shot consumers (call once per frame) ──────────────

  /** Returns true once per V-key press, then resets. */
  consumeViewToggle() {
    const v = this.viewTogglePending;
    this.viewTogglePending = false;
    return v;
  }

  /** Returns true once per E-key press, then resets. */
  consumeTopDownToggle() {
    const e = this.topDownTogglePending;
    this.topDownTogglePending = false;
    return e;
  }

  /** Returns accumulated mouse delta since last call, clamped and then reset. */
  consumeMouseDelta() {
    // Clamp to prevent huge jumps during frame spikes
    const MAX = 150;
    const delta = {
      x: Math.max(-MAX, Math.min(MAX, this.mouseDX)),
      y: Math.max(-MAX, Math.min(MAX, this.mouseDY)),
    };
    this.mouseDX = 0;
    this.mouseDY = 0;
    return delta;
  }

  /**
   * Returns a normalized direction vector based on currently pressed keys.
   * The vector is in local space (forward = -Z, right = +X).
   */
  getDirection() {
    const dir = new THREE.Vector3();
    if (this.forward) dir.z -= 1;
    if (this.backward) dir.z += 1;
    if (this.left) dir.x -= 1;
    if (this.right) dir.x += 1;
    if (dir.lengthSq() > 0) dir.normalize();
    return dir;
  }

  setPointerLockEnabled(enabled) {
    this.pointerLockEnabled = enabled;
  }

  /** Remove all event listeners. */
  dispose() {
    window.removeEventListener("keydown", this._onKeyDown);
    window.removeEventListener("keyup", this._onKeyUp);
    document.removeEventListener("mousemove", this._onMouseMove);
    document.removeEventListener("pointerlockchange", this._onPointerLockChange);
    this.domElement.removeEventListener("click", this._onClick);
  }
}
