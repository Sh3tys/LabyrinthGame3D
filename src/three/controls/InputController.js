/**
 * InputController
 * ---------------
 * Handles keyboard and mouse input for the player.
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

    // Bind event handlers
    this._onKeyDown = (e) => {
      this.keys.add(e.code);
      if (e.code === "KeyV") this.viewTogglePending = true;
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
      if (!this.pointerLocked) {
        this.clearMouseDelta();
      }
    };

    this._clearInputState = () => {
      this.keys.clear();
      this.clearMouseDelta();
    };

    this._onVisibilityChange = () => {
      if (document.hidden) {
        this._clearInputState();
      }
    };

    // Attach listeners
    window.addEventListener("keydown", this._onKeyDown);
    window.addEventListener("keyup", this._onKeyUp);
    window.addEventListener("blur", this._clearInputState);
    document.addEventListener("mousemove", this._onMouseMove);
    document.addEventListener("pointerlockchange", this._onPointerLockChange);
    document.addEventListener("visibilitychange", this._onVisibilityChange);

    // Click canvas to lock pointer
    this._onClick = () => {
      if (this.pointerLockEnabled) {
        domElement.requestPointerLock();
      }
    };
    domElement.addEventListener("click", this._onClick);
  }

  // ── Direction getters ───────────────────

  get forward() {
    return this.keys.has("KeyZ");
  }

  get backward() {
    return this.keys.has("KeyS");
  }

  get left() {
    return this.keys.has("KeyQ");
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

  setPointerLockEnabled(enabled) {
    this.pointerLockEnabled = enabled;
  }

  clearMouseDelta() {
    this.mouseDX = 0;
    this.mouseDY = 0;
  }

  /** Remove all event listeners. */
  dispose() {
    window.removeEventListener("keydown", this._onKeyDown);
    window.removeEventListener("keyup", this._onKeyUp);
    window.removeEventListener("blur", this._clearInputState);
    document.removeEventListener("mousemove", this._onMouseMove);
    document.removeEventListener(
      "pointerlockchange",
      this._onPointerLockChange,
    );
    document.removeEventListener("visibilitychange", this._onVisibilityChange);
    this.domElement.removeEventListener("click", this._onClick);
  }
}
