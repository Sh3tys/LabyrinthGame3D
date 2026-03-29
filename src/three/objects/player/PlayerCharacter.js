import * as THREE from "three";
import * as SkeletonUtils from "three/examples/jsm/utils/SkeletonUtils.js";
import { InputController } from "../../controls/InputController.js";
import { AnimationController } from "../../utils/AnimationController.js";
import { loadCached } from "../../utils/preloadAssets.js";
import { audioManager } from "../../utils/AudioManager.js";
import {
  MODEL_PATH,
  WALK_PATH,
  IDLE_PATH,
  MOVE_SPEED,
  MOUSE_SENSITIVITY,
  PITCH_LIMIT,
  FALLBACK_EYE_HEIGHT,
  TPV_OFFSET,
  CAMERA_COLLISION_RADIUS,
  CAMERA_COLLISION_HEIGHT,
  CAMERA_ANCHOR_HEIGHT_OFFSET,
  TPV_HIDE_MODEL_DISTANCE,
  TPV_SHOW_MODEL_DISTANCE,
  ACCEL_RATE,
  DECEL_RATE,
  MIN_VELOCITY_EPSILON,
  TPV_CAMERA_SMOOTH,
  VIEW_SWITCH_COOLDOWN,
  TPV_SWITCH_GRACE,
  SMOOTH_FACTOR,
  MAX_DT,
} from "./config.js";

// Player character controller - manages model, animation, camera, and input
export class PlayerCharacter {
  constructor(scene, camera, domElement) {
    this.scene = scene;
    this.camera = camera;
    this.position = new THREE.Vector3();
    this.velocity = new THREE.Vector3();

    this.currentYaw = 0;
    this.currentPitch = 0;
    this.targetYaw = 0;
    this.targetPitch = 0;
    this.eyeHeight = FALLBACK_EYE_HEIGHT;
    this.viewMode = "FPV";
    this.loaded = false;
    this.disposed = false;
    this.model = null;
    this.animController = null;
    this.walls = null;
    this.flashlight = null;
    this.topMarker = null;
    this.mazeSize = {
      width: 21,
      height: 21,
      cellSize: 2,
      centerX: -1,
      centerZ: -1,
    };
    this.topViewHeight = 50;
    this._tmpVecA = new THREE.Vector3();
    this._tmpVecB = new THREE.Vector3();
    this._tmpVecC = new THREE.Vector3();
    this._tmpMoveDir = new THREE.Vector3();
    this._tmpTargetVelocity = new THREE.Vector3();
    this._tmpAnchorWorld = new THREE.Vector3();
    this._tmpDesiredWorld = new THREE.Vector3();
    this.viewSwitchCooldown = 0;
    this.forceTPVCameraSnap = false;
    this.tpvSwitchGraceRemaining = 0;
    this.wasMoving = false;

    this.yawPivot = new THREE.Object3D();
    this.yawPivot.name = "PlayerYawPivot";
    scene.add(this.yawPivot);

    this.yawPivot.add(camera);
    camera.rotation.order = "YXZ";
    camera.near = 0.12;
    camera.updateProjectionMatrix();

    this.input = new InputController(domElement);
    this._recomputeTopViewHeight();
  }

  // Load player model and animations
  async load() {
    try {
      const template = await loadCached(MODEL_PATH, "model");
      if (this.disposed) return;

      const skin = SkeletonUtils.clone(template);
      this.model = skin;
      this.model.name = "PlayerSkin";
      this.model.scale.setScalar(0.01);
      this.model.rotation.y = Math.PI;

      skin.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });

      this.yawPivot.add(this.model);
      this.animController = new AnimationController(this.model);

      this._computeEyeHeight();
      this._applyViewSettings();
      this._setupFlashlight();
      this._setupTopMarker();

      this.loaded = true;
      this._loadAnimationsAsync();
    } catch (err) {
      console.error("[Player] Loading error:", err);
    }
  }

  // Load idle and walk animations
  async _loadAnimationsAsync() {
    if (!this.animController || this.disposed) return;

    const [idleFBX, walkFBX] = await Promise.all([
      loadCached(IDLE_PATH, "idle").catch(() => ({ animations: [] })),
      loadCached(WALK_PATH, "walk").catch(() => ({ animations: [] })),
    ]);

    if (!this.animController || this.disposed) return;

    if (idleFBX.animations?.length > 0) {
      this.animController.addAction("idle", idleFBX.animations[0]);
    }
    if (walkFBX.animations?.length > 0) {
      this.animController.addAction("walk", walkFBX.animations[0]);
    }
  }

  // Update player state each frame
  update(dt) {
    if (!this.loaded) return;

    dt = Math.min(dt, MAX_DT);

    this.viewSwitchCooldown = Math.max(0, this.viewSwitchCooldown - dt);
    this.tpvSwitchGraceRemaining = Math.max(
      0,
      this.tpvSwitchGraceRemaining - dt,
    );

    if (this.input.consumeViewToggle() && this.viewSwitchCooldown <= 0) {
      const modes = { FPV: "TPV", TPV: "TOP", TOP: "FPV" };
      this._switchViewMode(modes[this.viewMode]);
    }

    this._handleMouseLook(dt);
    const movedThisFrame = this._handleMovement(dt);

    if (this.walls) {
      if (!movedThisFrame && this.walls.resolveCollisions) {
        this.walls.resolveCollisions(this.position);
      }
      if (this.walls.getMazeSize) {
        this.mazeSize = this.walls.getMazeSize();
        this._recomputeTopViewHeight();
      }
    }

    if (this.animController) {
      this.animController.update(dt);
    }

    this.yawPivot.position.copy(this.position);
    this._updateCameraByMode(dt);
  }

  // Cleanup and dispose
  dispose() {
    this.disposed = true;
    audioManager.stopWalkSound();
    this.input.dispose();
    if (this.animController) this.animController.dispose();

    if (this.flashlight) {
      this.camera.remove(this.flashlight);
      if (this.flashlight.target) this.camera.remove(this.flashlight.target);
    }

    if (this.topMarker) {
      this.yawPivot.remove(this.topMarker);
      if (this.topMarker.geometry) this.topMarker.geometry.dispose();
      if (this.topMarker.material) this.topMarker.material.dispose();
    }

    this.scene.remove(this.yawPivot);
    this.model = null;
    this.loaded = false;
  }

  // Handle mouse look with smoothing
  _handleMouseLook(dt) {
    if (!this.input.pointerLocked || this.viewMode === "TOP") return;

    const { x: dx, y: dy } = this.input.consumeMouseDelta();
    this.targetYaw -= dx * MOUSE_SENSITIVITY;
    this.targetPitch -= dy * MOUSE_SENSITIVITY;
    this.targetPitch = Math.max(
      -PITCH_LIMIT,
      Math.min(PITCH_LIMIT, this.targetPitch),
    );

    const t = 1 - Math.exp(-SMOOTH_FACTOR * dt);
    this.currentYaw += (this.targetYaw - this.currentYaw) * t;
    this.currentPitch += (this.targetPitch - this.currentPitch) * t;

    this.yawPivot.rotation.y = this.currentYaw;
    this.camera.rotation.x = this.currentPitch;
  }

  // Handle keyboard movement input
  _handleMovement(dt) {
    const inputMoving = this.input.isMoving;
    let fwd, rgt;

    if (this.viewMode === "TOP") {
      fwd = new THREE.Vector3(0, 0, -1);
      rgt = new THREE.Vector3(1, 0, 0);
    } else {
      const q = this.yawPivot.quaternion;
      fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(q);
      rgt = new THREE.Vector3(1, 0, 0).applyQuaternion(q);
      fwd.y = 0;
      fwd.normalize();
      rgt.y = 0;
      rgt.normalize();
    }

    const moveDir = this._tmpMoveDir.set(0, 0, 0);
    if (this.input.forward) moveDir.add(fwd);
    if (this.input.backward) moveDir.sub(fwd);
    if (this.input.left) moveDir.sub(rgt);
    if (this.input.right) moveDir.add(rgt);

    const targetVelocity = this._tmpTargetVelocity.set(0, 0, 0);
    if (moveDir.lengthSq() > 0) {
      moveDir.normalize();
      targetVelocity.copy(moveDir).multiplyScalar(MOVE_SPEED);
    }

    const speedLerp =
      1 - Math.exp(-(inputMoving ? ACCEL_RATE : DECEL_RATE) * dt);
    this.velocity.lerp(targetVelocity, speedLerp);

    if (
      this.velocity.lengthSq() <
      MIN_VELOCITY_EPSILON * MIN_VELOCITY_EPSILON
    ) {
      this.velocity.set(0, 0, 0);
    }

    if (this.animController) {
      this.animController.setMoving(this.velocity.lengthSq() > 0.03);
    }

    const isMoving = this.velocity.lengthSq() > 0.03;
    if (isMoving && !this.wasMoving) {
      audioManager.startWalkSound();
    } else if (!isMoving && this.wasMoving) {
      audioManager.stopWalkSound();
    }
    this.wasMoving = isMoving;

    if (this.velocity.lengthSq() === 0) return false;

    const moveDelta = this._tmpVecA.copy(this.velocity).multiplyScalar(dt);

    if (this.walls?.moveAndSlide) {
      this.walls.moveAndSlide(this.position, moveDelta);
    } else {
      this.position.add(moveDelta);
      if (this.walls?.resolveCollisions) {
        this.walls.resolveCollisions(this.position);
      }
    }

    if (this.viewMode === "TOP") {
      const lookDir = this._tmpVecB.copy(this.velocity).normalize();
      const lookAtAngle = Math.atan2(lookDir.x, lookDir.z);
      this.targetYaw = lookAtAngle + Math.PI;
      this.currentYaw = this.targetYaw;
      this.yawPivot.rotation.y = this.currentYaw;
    }

    return true;
  }

  // Compute eye height from head bone
  _computeEyeHeight() {
    if (!this.model) return;
    this.model.updateMatrixWorld(true);

    let headBone = null;
    this.model.traverse((child) => {
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
      this.eyeHeight = worldPos.y - this.yawPivot.position.y;
    }
  }

  // Apply view-specific settings
  _applyViewSettings() {
    if (!this.model) return;

    const shouldLockPointer = this.viewMode !== "TOP";
    this.input.setPointerLockEnabled(shouldLockPointer);

    if (
      !shouldLockPointer &&
      document.pointerLockElement === this.input.domElement
    ) {
      document.exitPointerLock();
    }

    if (this.viewMode === "TOP") {
      this.scene.attach(this.camera);
      this.camera.position.set(
        this.position.x,
        this.topViewHeight,
        this.position.z,
      );
      this.camera.rotation.set(-Math.PI / 2, 0, 0);
      this.model.visible = true;
    } else {
      this.yawPivot.attach(this.camera);
      if (this.viewMode === "FPV") {
        this.camera.position.set(0, this.eyeHeight, 0);
        this.camera.rotation.set(this.currentPitch, 0, 0);
        this.model.visible = false;
      } else {
        this.forceTPVCameraSnap = true;
        this.tpvSwitchGraceRemaining = TPV_SWITCH_GRACE;
        this.model.visible = true;
      }
    }
  }

  // Switch to next view mode
  _switchViewMode(nextMode) {
    if (this.viewMode === nextMode) return;
    this.viewMode = nextMode;
    this.viewSwitchCooldown = VIEW_SWITCH_COOLDOWN;
    this.input.clearMouseDelta();
    this._applyViewSettings();
    if (this.onCameraModeSwitched) {
      this.onCameraModeSwitched(this.viewMode);
    }
  }

  // Update top view height based on maze size
  _recomputeTopViewHeight() {
    const span = Math.max(
      this.mazeSize.width * this.mazeSize.cellSize,
      this.mazeSize.height * this.mazeSize.cellSize,
    );
    const halfSpan = span / 2;
    const fovRadians = THREE.MathUtils.degToRad(this.camera.fov || 60);
    const fitHeight = (halfSpan + 6) / Math.tan(fovRadians / 2);
    this.topViewHeight = Math.max(35, fitHeight);
  }

  // Update camera position and rotation based on view mode
  _updateCameraByMode(dt) {
    if (this.viewMode === "TOP") {
      this.camera.position.set(
        this.position.x,
        this.topViewHeight,
        this.position.z,
      );
      this.camera.lookAt(this.position.x, 0, this.position.z);
      if (this.topMarker) this.topMarker.visible = true;
      if (this.model) this.model.visible = true;
      return;
    }

    if (this.viewMode === "FPV") {
      this.camera.position.set(0, this.eyeHeight, 0);
      this.camera.rotation.set(this.currentPitch, 0, 0);
      if (this.topMarker) this.topMarker.visible = false;
      if (this.model) this.model.visible = false;
      return;
    }

    const desiredLocal = this._tmpVecA.set(
      TPV_OFFSET.x,
      this.eyeHeight + TPV_OFFSET.y,
      TPV_OFFSET.z,
    );
    const anchorLocal = this._tmpVecC.set(
      0,
      this.eyeHeight + CAMERA_ANCHOR_HEIGHT_OFFSET,
      0,
    );
    const anchorWorld = this.yawPivot.localToWorld(
      this._tmpAnchorWorld.copy(anchorLocal),
    );
    const desiredWorld = this.yawPivot.localToWorld(
      this._tmpDesiredWorld.copy(desiredLocal),
    );

    if (this.walls?.sweepCameraCollisions) {
      this.walls.sweepCameraCollisions(
        anchorWorld,
        desiredWorld,
        CAMERA_COLLISION_RADIUS,
        CAMERA_COLLISION_HEIGHT,
      );
    } else if (this.walls?.resolveCameraCollisions) {
      this.walls.resolveCameraCollisions(
        desiredWorld,
        CAMERA_COLLISION_RADIUS,
        CAMERA_COLLISION_HEIGHT,
      );
    }

    const safeLocal = this.yawPivot.worldToLocal(desiredWorld);
    if (this.forceTPVCameraSnap) {
      this.camera.position.copy(safeLocal);
      this.forceTPVCameraSnap = false;
    } else {
      const camT = 1 - Math.exp(-TPV_CAMERA_SMOOTH * dt);
      this.camera.position.lerp(safeLocal, camT);
    }
    this.camera.rotation.set(this.currentPitch, 0, 0);

    if (this.topMarker) this.topMarker.visible = false;

    const cameraToHeadDistance = this.camera.position.distanceTo(anchorLocal);
    if (this.model) {
      if (this.tpvSwitchGraceRemaining > 0) {
        this.model.visible = true;
        return;
      }

      if (
        this.model.visible &&
        cameraToHeadDistance < TPV_HIDE_MODEL_DISTANCE
      ) {
        this.model.visible = false;
      } else if (
        !this.model.visible &&
        cameraToHeadDistance > TPV_SHOW_MODEL_DISTANCE
      ) {
        this.model.visible = true;
      }
    }
  }

  // Setup flashlight
  _setupFlashlight() {
    if (this.flashlight) return;

    const flashlight = new THREE.SpotLight(
      "#ffffff",
      2.2,
      24,
      Math.PI / 5,
      0.3,
      2,
    );
    flashlight.castShadow = true;
    flashlight.shadow.mapSize.set(1024, 1024);
    flashlight.position.set(0, 0, 0);

    const target = new THREE.Object3D();
    target.position.set(0, 0, -10);
    this.camera.add(target);
    flashlight.target = target;

    this.camera.add(flashlight);
    this.flashlight = flashlight;
  }

  // Setup top view marker
  _setupTopMarker() {
    if (this.topMarker) return;

    const marker = new THREE.Mesh(
      new THREE.SphereGeometry(0.5, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0x000000 }),
    );
    marker.position.set(0, this.eyeHeight + 1.4, 0);
    marker.visible = false;
    this.yawPivot.add(marker);
    this.topMarker = marker;
  }
}
