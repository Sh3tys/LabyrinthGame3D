// Handles keyboard and mouse input for player movement and actions
import { keyBindingsManager } from "../../utils/KeyBindings.js";

export class InputController {
  constructor(domElement) {
    this.domElement = domElement;
    this.keys = new Set();
    this.pointerLocked = false;
    this.pointerLockEnabled = true;
    this.mouseDX = 0;
    this.mouseDY = 0;
    this.viewTogglePending = false;

    this.bindings = keyBindingsManager.getBindings();

    // Event handlers
    this._onKeyDown = (e) => {
      this.keys.add(e.code);
      if (e.code === this.bindings.viewToggle) this.viewTogglePending = true;
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
      if (!this.pointerLocked) this.clearMouseDelta();
    };

    this._clearInputState = () => {
      this.keys.clear();
      this.clearMouseDelta();
    };

    this._onVisibilityChange = () => {
      if (document.hidden) this._clearInputState();
    };

    // Attach listeners
    window.addEventListener("keydown", this._onKeyDown);
    window.addEventListener("keyup", this._onKeyUp);
    window.addEventListener("blur", this._clearInputState);
    document.addEventListener("mousemove", this._onMouseMove);
    document.addEventListener("pointerlockchange", this._onPointerLockChange);
    document.addEventListener("visibilitychange", this._onVisibilityChange);

    // Click to lock pointer
    this._onClick = () => {
      if (this.pointerLockEnabled) domElement.requestPointerLock();
    };
    domElement.addEventListener("click", this._onClick);
  }

  // Direction checks
  get forward() {
    return this.keys.has(this.bindings.forward);
  }

  get backward() {
    return this.keys.has(this.bindings.backward);
  }

  get left() {
    return this.keys.has(this.bindings.left);
  }

  get right() {
    return this.keys.has(this.bindings.right);
  }

  get isMoving() {
    return this.forward || this.backward || this.left || this.right;
  }

  // Get view toggle (consume once per frame)
  consumeViewToggle() {
    const result = this.viewTogglePending;
    this.viewTogglePending = false;
    return result;
  }

  // Get mouse movement (clamped and reset each frame)
  consumeMouseDelta() {
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

  // Refresh bindings from settings
  refreshKeyBindings() {
    this.bindings = keyBindingsManager.getBindings();
  }

  // Cleanup
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
