import * as THREE from "three";

// Manages animation playback and transitions between states (idle/walk)
export class AnimationController {
  constructor(model) {
    this.model = model;
    this.mixer = new THREE.AnimationMixer(model);
    this.actions = {};
    this.activeAction = null;
    this.moving = false;
    this.fadeDuration = 0.3;
  }

  // Register animation and auto-play idle if first
  addAction(name, clip) {
    const cleanClip = this._stripRootMotion(clip);
    const action = this.mixer.clipAction(cleanClip);
    action.loop = THREE.LoopRepeat;
    this.actions[name] = action;

    if (name === "idle" && !this.activeAction) {
      this.fadeTo("idle");
    }
  }

  // Crossfade to animation by name
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

  // Switch between idle and walk based on movement state
  setMoving(isMoving) {
    if (this.moving === isMoving) return;
    this.moving = isMoving;
    this.fadeTo(isMoving ? "walk" : "idle");
  }

  // Update animation mixer (call every frame)
  update(dt) {
    this.mixer.update(dt);
  }

  // Cleanup
  dispose() {
    this.mixer.stopAllAction();
    this.mixer.uncacheRoot(this.model);
  }

  // Remove root motion from animation clip
  _stripRootMotion(clip) {
    const cleaned = clip.clone();
    cleaned.tracks = cleaned.tracks.filter((track) => {
      const isRootPos =
        track.name.endsWith(".position") &&
        (track.name.includes("Hips") || track.name.includes("Root"));
      return !isRootPos;
    });
    return cleaned;
  }
}
