import * as THREE from "three";

/**
 * AnimationController
 * -------------------
 * Manages animation playback and smooth transitions (crossfade)
 * between states like "idle" and "walk".
 *
 * Root motion (Hips/Root position tracks) is automatically stripped
 * so animations play in-place.
 */
export class AnimationController {
  constructor(model) {
    this.model = model;
    this.mixer = new THREE.AnimationMixer(model);
    this.actions = {}; // { idle: Action, walk: Action, ... }
    this.activeAction = null;
    this.moving = false;
    this.fadeDuration = 0.3;
  }

  /**
   * Register a new animation clip under the given name.
   * Root motion is stripped automatically.
   * If the name is "idle" and nothing is playing yet, it starts immediately.
   */
  addAction(name, clip) {
    const cleanClip = this._stripRootMotion(clip);
    const action = this.mixer.clipAction(cleanClip);
    action.loop = THREE.LoopRepeat;
    this.actions[name] = action;

    // Auto-play idle if nothing is active yet
    if (name === "idle" && !this.activeAction) {
      this.fadeTo("idle");
    }
  }

  /**
   * Crossfade to the animation with the given name.
   * Does nothing if it's already playing or doesn't exist.
   */
  fadeTo(name) {
    const next = this.actions[name];
    if (!next || next === this.activeAction) return;

    next.reset();
    next.enabled = true;
    next.setEffectiveTimeScale(1);
    next.setEffectiveWeight(1);

    if (this.activeAction) {
      next.crossFadeFrom(this.activeAction, this.fadeDuration, true);
    }

    next.play();
    this.activeAction = next;
  }

  /**
   * Switch between idle and walk animations based on movement state.
   * Only triggers a transition when the state actually changes.
   */
  setMoving(isMoving) {
    if (this.moving === isMoving) return;
    this.moving = isMoving;
    this.fadeTo(isMoving ? "walk" : "idle");
  }

  /** Advance the mixer by deltaTime seconds. Call every frame. */
  update(dt) {
    this.mixer.update(dt);
  }

  /** Stop all animations and clean up. */
  dispose() {
    this.mixer.stopAllAction();
    this.mixer.uncacheRoot(this.model);
  }

  // ── Internal helpers ──────────────────────────────────────

  /**
   * Remove position tracks on the root bone (Hips / Root)
   * so the animation plays in-place instead of drifting.
   */
  _stripRootMotion(clip) {
    const cleaned = clip.clone();
    cleaned.tracks = cleaned.tracks.filter((track) => {
      const isRootPosition =
        track.name.endsWith(".position") &&
        (track.name.includes("Hips") || track.name.includes("Root"));
      return !isRootPosition;
    });
    return cleaned;
  }
}
