import React, { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";
import * as SkeletonUtils from "three/examples/jsm/utils/SkeletonUtils.js";
import { InputController } from "../controls/InputController.js";
import { AnimationController } from "../utils/AnimationController.js";

// ─── Configuration ──────────────────────────────────────────

const MODEL_PATH = "/models/player/playerModel.fbx";
const WALK_PATH = "/models/player/playerAnimationWalk.fbx";
const IDLE_PATH = "/models/player/playerAnimationStop.fbx";

const MOVE_SPEED = 6.2;
const MOUSE_SENSITIVITY = 0.002;
const PITCH_LIMIT = Math.PI / 2.2;
const FALLBACK_EYE_HEIGHT = 1.6;
const TPV_OFFSET = new THREE.Vector3(0, 1.2, 3.5);
const CAMERA_COLLISION_RADIUS = 0.25;
const CAMERA_COLLISION_HEIGHT = 0.8;
const CAMERA_ANCHOR_HEIGHT_OFFSET = 0.2;
const TPV_HIDE_MODEL_DISTANCE = 1.0;
const TPV_SHOW_MODEL_DISTANCE = 1.25;
const ACCEL_RATE = 18;
const DECEL_RATE = 14;
const MIN_VELOCITY_EPSILON = 0.01;
const TPV_CAMERA_SMOOTH = 18;

// Smoothing: higher = snappier camera, lower = more floaty
const SMOOTH_FACTOR = 20;
// Clamp deltaTime to avoid physics jumps on tab-switch / frame spikes
const MAX_DT = 0.1;

const sharedLoader = new FBXLoader();
const assetCache = {
  model: null,
  idle: null,
  walk: null,
};

function loadCached(path, key) {
  if (!assetCache[key]) {
    assetCache[key] = sharedLoader.loadAsync(path).catch((err) => {
      assetCache[key] = null;
      throw err;
    });
  }
  return assetCache[key];
}

export function prewarmPlayerAssets() {
  loadCached(MODEL_PATH, "model").catch(() => null);
  loadCached(IDLE_PATH, "idle").catch(() => null);
  loadCached(WALK_PATH, "walk").catch(() => null);
}

// ─── PlayerCharacter Class ──────────────────────────────────

/**
 * PlayerCharacter
 * ---------------
 * OOP class that manages the player character in a Three.js scene:
 *   - Loads an FBX model and animation clips (idle, walk)
 *   - Handles FPS-style mouse look and WASD/ZQSD movement
 *   - Supports first-person (FPV) and third-person (TPV) camera
 *   - Optionally resolves collisions via a "walls" provider
 *
 * Usage:
 *   const player = new PlayerCharacter(scene, camera, canvas);
 *   await player.load();
 *   // in your render loop:
 *   player.update(deltaTime);
 *   // on cleanup:
 *   player.dispose();
 */
export class PlayerCharacter {
  constructor(scene, camera, domElement) {
    this.scene = scene;
    this.camera = camera;
    this.position = new THREE.Vector3();
    this.velocity = new THREE.Vector3();

    // Current (smoothed) rotations
    this.currentYaw = 0;
    this.currentPitch = 0;

    // Target rotations (set instantly by mouse input, smoothed toward)
    this.targetYaw = 0;
    this.targetPitch = 0;
    this.eyeHeight = FALLBACK_EYE_HEIGHT;
    this.viewMode = 'FPV';
    this.loaded = false;
    this.model = null;
    this.animController = null;
    this.walls = null;
    this.flashlight = null;
    this.topMarker = null;
    this.mazeSize = { width: 21, height: 21, cellSize: 2, centerX: -1, centerZ: -1 };
    this.topViewHeight = 50;
    this._tmpVecA = new THREE.Vector3();
    this._tmpVecB = new THREE.Vector3();
    this._tmpVecC = new THREE.Vector3();
    this._tmpMoveDir = new THREE.Vector3();
    this._tmpTargetVelocity = new THREE.Vector3();
    this._tmpAnchorWorld = new THREE.Vector3();
    this._tmpDesiredWorld = new THREE.Vector3();

    // Yaw pivot — parent of camera and model, rotates on Y axis
    this.yawPivot = new THREE.Object3D();
    this.yawPivot.name = "PlayerYawPivot";
    scene.add(this.yawPivot);

    // Attach camera to pivot
    this.yawPivot.add(camera);
    camera.rotation.order = "YXZ";
    camera.near = 0.12;
    camera.updateProjectionMatrix();

    // Input controller
    this.input = new InputController(domElement);

    this._recomputeTopViewHeight();
  }

  // ── Loading ───────────────────────────────────────────────

  /** Load the player model and animation clips. */
  async load() {
    try {
      const template = await loadCached(MODEL_PATH, "model");
      const skin = SkeletonUtils.clone(template);
      this.model = skin;
      this.model.name = "PlayerSkin";
      this.model.scale.setScalar(0.01);
      this.model.rotation.y = Math.PI;

      // Enable shadows on all meshes
      skin.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });

      this.yawPivot.add(this.model);

      this.animController = new AnimationController(this.model);

      // Set camera height from head bone
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

  async _loadAnimationsAsync() {
    if (!this.animController) return;

    const [idleFBX, walkFBX] = await Promise.all([
      loadCached(IDLE_PATH, "idle").catch(() => ({ animations: [] })),
      loadCached(WALK_PATH, "walk").catch(() => ({ animations: [] })),
    ]);

    if (!this.animController) return;

    if (idleFBX.animations?.length > 0) {
      this.animController.addAction("idle", idleFBX.animations[0]);
    }
    if (walkFBX.animations?.length > 0) {
      this.animController.addAction("walk", walkFBX.animations[0]);
    }
  }

  // ── Per-frame update ──────────────────────────────────────

  /** Call every frame with the delta time in seconds. */
  update(dt) {
    if (!this.loaded) return;

    // Clamp delta time to prevent huge jumps
    dt = Math.min(dt, MAX_DT);

    // Touche V : Cycler entre les vues (1ère, 3ème, Haut)
    if (this.input.consumeViewToggle()) {
      if (this.viewMode === 'FPV') this.viewMode = 'TPV';
      else if (this.viewMode === 'TPV') this.viewMode = 'TOP';
      else this.viewMode = 'FPV';
      
      this._applyViewSettings();
    }

    this._handleMouseLook(dt);
    const movedThisFrame = this._handleMovement(dt);

    // Collision resolution (if a wall provider is set)
    if (this.walls) {
      if (!movedThisFrame && this.walls.resolveCollisions) {
        this.walls.resolveCollisions(this.position);
      }

      if (this.walls.getMazeSize) {
        this.mazeSize = this.walls.getMazeSize();
        this._recomputeTopViewHeight();
      }
    }

    // Advance animations
    if (this.animController) {
      this.animController.update(dt);
    }

    // Sync pivot position
    this.yawPivot.position.copy(this.position);

    this._updateCameraByMode(dt);
  }

  // ── Cleanup ───────────────────────────────────────────────

  /** Remove from scene and release resources. */
  dispose() {
    this.input.dispose();
    if (this.animController) this.animController.dispose();

    if (this.flashlight) {
      this.camera.remove(this.flashlight);
      if (this.flashlight.target) this.camera.remove(this.flashlight.target);
      this.flashlight = null;
    }

    if (this.topMarker) {
      this.yawPivot.remove(this.topMarker);
      if (this.topMarker.geometry) this.topMarker.geometry.dispose();
      if (this.topMarker.material) this.topMarker.material.dispose();
      this.topMarker = null;
    }

    this.scene.remove(this.yawPivot);
  }

  // ── Internal helpers ──────────────────────────────────────

  /** Rotate camera based on mouse movement with smooth interpolation. */
  _handleMouseLook(dt) {
    if (!this.input.pointerLocked || this.viewMode === 'TOP') return;

    // Update target rotations from raw mouse input
    const { x: dx, y: dy } = this.input.consumeMouseDelta();
    this.targetYaw -= dx * MOUSE_SENSITIVITY;
    this.targetPitch -= dy * MOUSE_SENSITIVITY;
    this.targetPitch = Math.max(-PITCH_LIMIT, Math.min(PITCH_LIMIT, this.targetPitch));

    // Smoothly interpolate current rotation toward the target
    // Using exponential decay: 1 - e^(-factor * dt) gives frame-rate-independent smoothing
    const t = 1 - Math.exp(-SMOOTH_FACTOR * dt);
    this.currentYaw += (this.targetYaw - this.currentYaw) * t;
    this.currentPitch += (this.targetPitch - this.currentPitch) * t;

    // Apply smoothed rotations
    this.yawPivot.rotation.y = this.currentYaw;
    this.camera.rotation.x = this.currentPitch;
  }

  /** Move position based on keyboard input. */
  _handleMovement(dt) {
    const inputMoving = this.input.isMoving;
    let fwd;
    let rgt;

    if (this.viewMode === 'TOP') {
      // En vue de dessus (TOP), axes mondiaux
      fwd = new THREE.Vector3(0, 0, -1);
      rgt = new THREE.Vector3(1, 0, 0);
    } else {
      const q = this.yawPivot.quaternion;
      // Vecteurs directionnels projetés sur le plan XZ
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

    const speedLerp = 1 - Math.exp(-(inputMoving ? ACCEL_RATE : DECEL_RATE) * dt);
    this.velocity.lerp(targetVelocity, speedLerp);

    if (this.velocity.lengthSq() < MIN_VELOCITY_EPSILON * MIN_VELOCITY_EPSILON) {
      this.velocity.set(0, 0, 0);
    }

    if (this.animController) {
      this.animController.setMoving(this.velocity.lengthSq() > 0.03);
    }

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

    // En vue de dessus, on fait pivoter le modèle pour qu'il regarde vers où il va
    if (this.viewMode === 'TOP') {
      const lookDir = this._tmpVecB.copy(this.velocity).normalize();
      const lookAtAngle = Math.atan2(lookDir.x, lookDir.z);
      this.targetYaw = lookAtAngle + Math.PI;
      this.currentYaw = this.targetYaw;
      this.yawPivot.rotation.y = this.currentYaw;
    }

    return true;
  }

  /** Find the head bone and set the eye height from it. */
  _computeEyeHeight() {
    if (!this.model) return;
    this.model.updateMatrixWorld(true);

    let headBone = null;
    this.model.traverse((child) => {
      if (!headBone && child.isBone && child.name.toLowerCase().includes("head")) {
        headBone = child;
      }
    });

    if (headBone) {
      const worldPos = new THREE.Vector3();
      headBone.getWorldPosition(worldPos);
      this.eyeHeight = worldPos.y - this.yawPivot.position.y;
      console.log(`[Player] Eye height: ${this.eyeHeight.toFixed(2)}m`);
    }
  }

  /** Position the camera for FPV, TPV or Top-Down mode. */
  _applyViewSettings() {
    if (!this.model) return;

    const shouldLockPointer = this.viewMode !== "TOP";
    this.input.setPointerLockEnabled(shouldLockPointer);

    if (!shouldLockPointer && document.pointerLockElement === this.input.domElement) {
      document.exitPointerLock();
    }

    if (this.viewMode === 'TOP') {
      // VUE DE DESSUS : map globale avec joueur au centre
      this.scene.add(this.camera);
      this.camera.position.set(this.position.x, this.topViewHeight, this.position.z);
      this.camera.rotation.set(-Math.PI / 2, 0, 0); 
      this.model.visible = true;
    } else {
      // VUES JOUEUR : La caméra suit le personnage
      this.yawPivot.add(this.camera);

      if (this.viewMode === 'FPV') {
        // Vue 1ère personne
        this.camera.position.set(0, this.eyeHeight, 0);
        this.camera.rotation.set(this.currentPitch, 0, 0);
        this.model.visible = false;
      } else {
        // Vue 3ème personne
        this.camera.position.set(
          TPV_OFFSET.x,
          this.eyeHeight + TPV_OFFSET.y,
          TPV_OFFSET.z,
        );
        this.camera.rotation.set(this.currentPitch, 0, 0);
        this.model.visible = true;
      }
    }
  }

  _recomputeTopViewHeight() {
    const span = Math.max(this.mazeSize.width * this.mazeSize.cellSize, this.mazeSize.height * this.mazeSize.cellSize);
    const halfSpan = span / 2;
    const fovRadians = THREE.MathUtils.degToRad(this.camera.fov || 60);
    const fitHeight = (halfSpan + 6) / Math.tan(fovRadians / 2);
    this.topViewHeight = Math.max(35, fitHeight);
  }

  _updateCameraByMode(dt) {
    if (this.viewMode === 'TOP') {
      this.camera.position.set(this.position.x, this.topViewHeight, this.position.z);
      this.camera.lookAt(this.position.x, 0, this.position.z);
      if (this.topMarker) this.topMarker.visible = true;
      if (this.model) this.model.visible = true;
      return;
    }

    if (this.viewMode === 'FPV') {
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

    const anchorLocal = this._tmpVecC.set(0, this.eyeHeight + CAMERA_ANCHOR_HEIGHT_OFFSET, 0);
    const anchorWorld = this.yawPivot.localToWorld(this._tmpAnchorWorld.copy(anchorLocal));
    const desiredWorld = this.yawPivot.localToWorld(this._tmpDesiredWorld.copy(desiredLocal));

    if (this.walls?.sweepCameraCollisions) {
      this.walls.sweepCameraCollisions(
        anchorWorld,
        desiredWorld,
        CAMERA_COLLISION_RADIUS,
        CAMERA_COLLISION_HEIGHT,
      );
    } else if (this.walls?.resolveCameraCollisions) {
      this.walls.resolveCameraCollisions(desiredWorld, CAMERA_COLLISION_RADIUS, CAMERA_COLLISION_HEIGHT);
    }

    const safeLocal = this.yawPivot.worldToLocal(desiredWorld);
    const camT = 1 - Math.exp(-TPV_CAMERA_SMOOTH * dt);
    this.camera.position.lerp(safeLocal, camT);
    this.camera.rotation.set(this.currentPitch, 0, 0);

    if (this.topMarker) this.topMarker.visible = false;

    const cameraToHeadDistance = this.camera.position.distanceTo(anchorLocal);
    if (this.model) {
      if (this.model.visible && cameraToHeadDistance < TPV_HIDE_MODEL_DISTANCE) {
        this.model.visible = false;
      } else if (!this.model.visible && cameraToHeadDistance > TPV_SHOW_MODEL_DISTANCE) {
        this.model.visible = true;
      }
    }
  }

  _setupFlashlight() {
    if (this.flashlight) return;

    const flashlight = new THREE.SpotLight("#ffffff", 2.2, 24, Math.PI / 5, 0.3, 2);
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

  _setupTopMarker() {
    if (this.topMarker) return;

    const marker = new THREE.Mesh(
      new THREE.SphereGeometry(0.28, 16, 16),
      new THREE.MeshBasicMaterial({ color: "#ffd54a" }),
    );
    marker.position.set(0, this.eyeHeight + 1.4, 0);
    marker.visible = false;
    this.yawPivot.add(marker);
    this.topMarker = marker;
  }
}

// ─── React Component Wrapper ────────────────────────────────

/**
 * <Player /> — thin React wrapper around PlayerCharacter.
 *
 * Must be placed inside a react-three-fiber <Canvas>.
 * It creates the PlayerCharacter on mount, calls update() every
 * frame via useFrame, and disposes on unmount.
 *
 * Props:
 *   walls - optional collision provider with resolveCollisions()
 */
export function Player({ walls, initialPosition = [0, 0, 0] }) {
  const { scene, camera, gl } = useThree();
  const playerRef = useRef(null);
  const [startX, startY, startZ] = initialPosition;

  useEffect(() => {
    const player = new PlayerCharacter(scene, camera, gl.domElement);
    player.position.set(startX, startY, startZ);
    player.load();
    playerRef.current = player;

    return () => player.dispose();
  }, [scene, camera, gl, startX, startY, startZ]);

  useEffect(() => {
    if (playerRef.current) {
      playerRef.current.walls = walls || null;
    }
  }, [walls]);

  useFrame((_, delta) => {
    if (playerRef.current) {
      playerRef.current.update(delta);
    }
  });

  return null;
}
