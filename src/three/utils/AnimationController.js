import * as THREE from "three";

/**
 * AnimationController
 * -------------------
 * Gère les transitions entre les états d'animation (Idle, Walk).
 * Utilise un système de fondu (crossfade) pour des transitions fluides.
 */
export class AnimationController {
  #mixer;
  #actions = {}; // { idle, walk }
  #activeAction = null;
  #model;

  static FADE_DURATION = 0.3;

  constructor(model) {
    this.#model = model;
    this.#mixer = new THREE.AnimationMixer(model);
  }

  /**
   * Ajoute une animation à partir d'un fichier FBX.
   * @param {string} name - Nom de l'action ('idle', 'walk')
   * @param {THREE.AnimationClip} clip - Le clip chargé
   */
  addAction(name, clip) {
    // On enlève le "Root Motion" (mouvement intégré à l'anim)
    // pour que le perso reste sur place par rapport à son pivot.
    const cleanClip = this.#stripRootMotion(clip);
    const action = this.#mixer.clipAction(cleanClip);

    if (name === "idle" || name === "walk") {
      action.loop = THREE.LoopRepeat;
    }

    this.#actions[name] = action;

    // Si c'est l'idle et qu'on n'a pas encore d'action active, on le lance
    if (name === "idle" && !this.#activeAction) {
      this.fadeTo("idle");
    }
  }

  /**
   * Retire les pistes de translation sur le root bone (Hips) pour garder l'anim sur place.
   */
  #stripRootMotion(clip) {
    // On clone pour ne pas modifier l'original si partagé
    const newClip = clip.clone();

    // Mixamo utilise généralement 'mixamorig:Hips' ou 'Hips' comme root.
    // On cherche les pistes (tracks) de position qui concernent le bassin.
    newClip.tracks = newClip.tracks.filter((track) => {
      // Si c'est une piste de position (.position) sur le root (Hips), on l'enlève.
      // Sauf si c'est pour l'idle ou le saut (où on veut parfois garder un peu de Y),
      // mais ici on veut forcer le "In-Place".
      const isRootPosition =
        track.name.endsWith(".position") &&
        (track.name.includes("Hips") || track.name.includes("Root"));

      return !isRootPosition;
    });

    return newClip;
  }

  /**
   * Transition fluide vers une nouvelle animation.
   */
  fadeTo(name) {
    const nextAction = this.#actions[name];
    if (!nextAction || nextAction === this.#activeAction) return;

    if (this.#activeAction) {
      nextAction.reset();
      nextAction.enabled = true;
      nextAction.setEffectiveTimeScale(1);
      nextAction.setEffectiveWeight(1);
      nextAction.crossFadeFrom(
        this.#activeAction,
        AnimationController.FADE_DURATION,
        true,
      );
      nextAction.play();
    } else {
      nextAction.reset();
      nextAction.play();
    }

    this.#activeAction = nextAction;
  }

  #isMoving = false;

  setMoving(moving) {
    if (this.#isMoving === moving) return;
    this.#isMoving = moving;

    //on switch
    if (!moving) {
      this.fadeTo("idle");
    } else {
      this.fadeTo("walk");
    }
  }

  update(deltaTime) {
    this.#mixer.update(deltaTime);
  }

  dispose() {
    this.#mixer.stopAllAction();
    this.#mixer.uncacheRoot(this.#model);
  }
}
