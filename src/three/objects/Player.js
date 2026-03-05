import * as THREE from "three";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";
import { InputController } from "../controls/InputController.js";
import { AnimationController } from "../utils/AnimationController.js";

/**
 * PlayerCharacter
 * ---------------
 * Gère le chargement du modèle FBX et des animations séparées.
 * Supporte le switch FPV/TPV et les collisions.
 */
export class PlayerCharacter {
  static MODEL_PATH = "/assets/playerModel/playerModel.fbx";
  static WALK_PATH = "/assets/playerModel/playerAnimationWalk.fbx";
  static JUMP_PATH = "/assets/playerModel/playerAnimationJump.fbx";
  static IDLE_PATH = "/assets/playerModel/playerAnimationStop.fbx";

  static RUN_SPEED = 9;
  static MOVE_SPEED = 5;
  static MOUSE_SENSITIVITY = 0.002;
  static PITCH_LIMIT = Math.PI / 2.2;
  static FALLBACK_EYE_HEIGHT = 1.6;

  static TPV_OFFSET = new THREE.Vector3(0, 1.2, 3.5);

  #scene;
  #camera;
  #input;
  #walls;
  #animController = null;
  #model = null;
  #yawPivot;
  #loaded = false;
  #pitch = 0;
  #position;
  #eyeHeight = PlayerCharacter.FALLBACK_EYE_HEIGHT;

  #isFPV = true;

  constructor(scene, camera, domEl, walls) {
    this.#scene = scene;
    this.#camera = camera;
    this.#walls = walls;
    this.#position = new THREE.Vector3(0, 0, 0);

    this.#yawPivot = new THREE.Object3D();
    this.#yawPivot.name = "PlayerYawPivot";
    scene.add(this.#yawPivot);

    this.#yawPivot.add(this.#camera);
    this.#camera.rotation.order = "YXZ";

    this.#input = new InputController(domEl);

    this._loadModels();
  }

  async _loadModels() {
    const loader = new FBXLoader();
    const texLoader = new THREE.TextureLoader();

    try {
      console.log("[PlayerCharacter] Chargement du modèle FBX...");

      // 1. Charger le modèle principal (Skin)
      const skinObject = await loader.loadAsync(PlayerCharacter.MODEL_PATH);
      this.#model = skinObject;
      this.#model.name = "PlayerSkin";

      // Ajustement échelle
      this.#model.scale.setScalar(0.01);
      // On tourne le modèle de 180° car les modèles Mixamo font face à la caméra (+Z) par défaut.
      // On veut qu'il regarde vers l'avant (-Z).
      this.#model.rotation.y = Math.PI;

      // Analyse des animations intégrées au modèle principal
      if (skinObject.animations && skinObject.animations.length > 0) {
        console.log(
          `[PlayerCharacter] ${skinObject.animations.length} animations trouvées dans le modèle principal :`,
          skinObject.animations.map((a) => a.name),
        );
      }

      this.#model.traverse((child) => {
        if (child.isMesh) {
          console.log(`[PlayerCharacter] Mesh: ${child.name}`);
          child.castShadow = true;
          child.receiveShadow = true;

          if (child.material) {
            const mats = Array.isArray(child.material)
              ? child.material
              : [child.material];
            mats.forEach((m) => {
              console.log(
                `  - Material: ${m.name}, Map: ${m.map ? "Yes" : "No"}`,
              );
              m.roughness = 0.7;
              m.metalness = 0.3;
            });
          }
        }
      });

      this.#yawPivot.add(this.#model);

      // 2. Initialiser le contrôleur d'anim
      this.#animController = new AnimationController(this.#model);

      // 3. Charger les animations externes en parallèle
      console.log("[PlayerCharacter] Chargement des animations externes...");
      const [idleFBX, walkFBX, jumpFBX] = await Promise.all([
        loader
          .loadAsync(PlayerCharacter.IDLE_PATH)
          .catch(() => ({ animations: [] })),
        loader
          .loadAsync(PlayerCharacter.WALK_PATH)
          .catch(() => ({ animations: [] })),
        loader
          .loadAsync(PlayerCharacter.JUMP_PATH)
          .catch(() => ({ animations: [] })),
      ]);

      if (idleFBX.animations.length > 0)
        this.#animController.addAction("idle", idleFBX.animations[0]);
      if (walkFBX.animations.length > 0)
        this.#animController.addAction("walk", walkFBX.animations[0]);
      if (jumpFBX.animations.length > 0)
        this.#animController.addAction("jump", jumpFBX.animations[0]);

      // Si on a des animations intégrées mais qu'on n'a pas chargé d'externes, on utilise les intégrées
      if (skinObject.animations.length > 0) {
        skinObject.animations.forEach((anim) => {
          const name = anim.name.toLowerCase();
          if (name.includes("run")) this.#animController.addAction("run", anim);
          // On peut mapper d'autres animations ici
        });
      }

      this._computeEyeHeight();
      this._applyViewSettings();

      this.#loaded = true;
      console.log("[PlayerCharacter] Modèle et animations FBX chargés.");
    } catch (error) {
      console.error(
        "[PlayerCharacter] Erreur critique chargement FBX :",
        error,
      );
    }
  }

  _computeEyeHeight() {
    if (!this.#model) return;
    this.#model.updateMatrixWorld(true);

    let headBone = null;
    this.#model.traverse((child) => {
      if (
        !headBone &&
        child.isBone &&
        child.name.toLowerCase().includes("head")
      ) {
        headBone = child;
      }
    });

    if (headBone) {
      const worldPos = new THREE.Vector3();
      headBone.getWorldPosition(worldPos);
      this.#eyeHeight = worldPos.y - this.#yawPivot.position.y;
      console.log(
        `[PlayerCharacter] Hauteur yeux : ${this.#eyeHeight.toFixed(2)}m`,
      );
    } else {
      this.#eyeHeight = PlayerCharacter.FALLBACK_EYE_HEIGHT;
    }
  }

  _applyViewSettings() {
    if (!this.#model) return;

    if (this.#isFPV) {
      this.#camera.position.set(0, this.#eyeHeight, 0);
      this.#model.visible = false;
    } else {
      const offset = PlayerCharacter.TPV_OFFSET;
      this.#camera.position.set(offset.x, this.#eyeHeight + offset.y, offset.z);
      this.#model.visible = true;
    }
  }

  update(deltaTime) {
    if (!this.#loaded) return;

    if (this.#input.consumeViewToggle()) {
      this.#isFPV = !this.#isFPV;
      this._applyViewSettings();
    }

    this._handleMouseLook();
    this._handleMovement(deltaTime);

    if (this.#walls) {
      this.#walls.resolveCollisions(this.#position);
    }

    this._updateAnimation(deltaTime);
    this.#yawPivot.position.copy(this.#position);
  }

  _handleMouseLook() {
    if (!this.#input.isPointerLocked) return;
    const { x: dx, y: dy } = this.#input.consumeMouseDelta();
    this.#yawPivot.rotation.y -= dx * PlayerCharacter.MOUSE_SENSITIVITY;
    this.#pitch -= dy * PlayerCharacter.MOUSE_SENSITIVITY;
    this.#pitch = Math.max(
      -PlayerCharacter.PITCH_LIMIT,
      Math.min(PlayerCharacter.PITCH_LIMIT, this.#pitch),
    );
    this.#camera.rotation.x = this.#pitch;
  }

  _handleMovement(deltaTime) {
    const isMoving = this.#input.isMoving;
    const isRunning = this.#input.run;

    this.#animController.setMoving(isMoving, isRunning);

    if (!isMoving) return;

    const currentSpeed = isRunning
      ? PlayerCharacter.RUN_SPEED
      : PlayerCharacter.MOVE_SPEED;
    const speed = currentSpeed * deltaTime;

    const q = this.#yawPivot.quaternion;
    const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(q);
    const rgt = new THREE.Vector3(1, 0, 0).applyQuaternion(q);
    fwd.y = 0;
    fwd.normalize();
    rgt.y = 0;
    rgt.normalize();

    if (this.#input.forward) this.#position.addScaledVector(fwd, speed);
    if (this.#input.backward) this.#position.addScaledVector(fwd, -speed);
    if (this.#input.left) this.#position.addScaledVector(rgt, -speed);
    if (this.#input.right) this.#position.addScaledVector(rgt, speed);
  }

  _updateAnimation(deltaTime) {
    if (this.#animController) {
      this.#animController.update(deltaTime);
    }
  }

  dispose() {
    this.#input.dispose();
    this.#animController?.dispose();
    this.#scene.remove(this.#yawPivot);
  }
}
