import React, { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";
import { InputController } from "../controls/InputController.js";
import { AnimationController } from "../utils/AnimationController.js";

// ─── Configuration ──────────────────────────────────────────

const MODEL_PATH = "/models/player/playerModel.fbx";
const WALK_PATH = "/models/player/playerAnimationWalk.fbx";
const IDLE_PATH = "/models/player/playerAnimationStop.fbx";

const MOVE_SPEED = 5;
const MOUSE_SENSITIVITY = 0.002;
const PITCH_LIMIT = Math.PI / 2.2;
const FALLBACK_EYE_HEIGHT = 1.6;
const TPV_OFFSET = new THREE.Vector3(0, 1.2, 3.5);
const TOP_OFFSET = new THREE.Vector3(0, 15, 0); // Hauteur pour la vue d'en haut

// Smoothing: higher = snappier camera, lower = more floaty
const SMOOTH_FACTOR = 20;
// Clamp deltaTime to avoid physics jumps on tab-switch / frame spikes
const MAX_DT = 0.1;

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

    // Current (smoothed) rotations
    this.currentYaw = 0;
    this.currentPitch = 0;

    // Target rotations (set instantly by mouse input, smoothed toward)
    this.targetYaw = 0;
    this.targetPitch = 0;
    this.eyeHeight = FALLBACK_EYE_HEIGHT;
    this.isFPV = true;
    this.isTopDown = false;
    this.loaded = false;
    this.model = null;
    this.animController = null;
    this.walls = null;

    // Yaw pivot — parent of camera and model, rotates on Y axis
    this.yawPivot = new THREE.Object3D();
    this.yawPivot.name = "PlayerYawPivot";
    scene.add(this.yawPivot);

    // Attach camera to pivot
    this.yawPivot.add(camera);
    camera.rotation.order = "YXZ";

    // Input controller
    this.input = new InputController(domElement);
  }

  // ── Loading ───────────────────────────────────────────────

  /** Load the player model and animation clips. */
  async load() {
    const loader = new FBXLoader();

    try {
      console.log("[Player] Loading model...");

      // Load the character model
      const skin = await loader.loadAsync(MODEL_PATH);
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

      // Load animation clips
      this.animController = new AnimationController(this.model);

      console.log("[Player] Loading animations...");
      const [idleFBX, walkFBX] = await Promise.all([
        loader.loadAsync(IDLE_PATH).catch(() => ({ animations: [] })),
        loader.loadAsync(WALK_PATH).catch(() => ({ animations: [] })),
      ]);

      if (idleFBX.animations.length > 0) {
        this.animController.addAction("idle", idleFBX.animations[0]);
      }
      if (walkFBX.animations.length > 0) {
        this.animController.addAction("walk", walkFBX.animations[0]);
      }

      // Set camera height from head bone
      this._computeEyeHeight();
      this._applyViewSettings();

      this.loaded = true;
      console.log("[Player] Ready.");
    } catch (err) {
      console.error("[Player] Loading error:", err);
    }
  }

  // ── Per-frame update ──────────────────────────────────────

  /** Call every frame with the delta time in seconds. */
  update(dt) {
    if (!this.loaded) return;

    // Clamp delta time to prevent huge jumps
    dt = Math.min(dt, MAX_DT);

    // Toggle FPV / TPV
    if (this.input.consumeViewToggle()) {
      this.isFPV = !this.isFPV;
      this.isTopDown = false; // Désactiver le mode haut si on change de vue
      this._applyViewSettings();
    }

    // Touche E : basculer la vue d'en haut
    if (this.input.consumeTopDownToggle()) {
      this.isTopDown = !this.isTopDown;
      this._applyViewSettings();
    }

    this._handleMouseLook(dt);
    this._handleMovement(dt);

    // Collision resolution (if a wall provider is set)
    if (this.walls) {
      this.walls.resolveCollisions(this.position);
    }

    // Advance animations
    if (this.animController) {
      this.animController.update(dt);
    }

    // Sync pivot position
    this.yawPivot.position.copy(this.position);
  }

  // ── Cleanup ───────────────────────────────────────────────

  /** Remove from scene and release resources. */
  dispose() {
    this.input.dispose();
    if (this.animController) this.animController.dispose();
    this.scene.remove(this.yawPivot);
  }

  // ── Internal helpers ──────────────────────────────────────

  /** Rotate camera based on mouse movement with smooth interpolation. */
  _handleMouseLook(dt) {
    if (!this.input.pointerLocked || this.isTopDown) return;

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
    const moving = this.input.isMoving;

    if (this.animController) {
      this.animController.setMoving(moving);
    }
    if (!moving) return;

    const speed = MOVE_SPEED * dt;
    const q = this.yawPivot.quaternion;

    // Forward and right vectors projected onto the XZ plane
    const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(q);
    const rgt = new THREE.Vector3(1, 0, 0).applyQuaternion(q);
    fwd.y = 0;
    fwd.normalize();
    rgt.y = 0;
    rgt.normalize();

    if (this.input.forward) this.position.addScaledVector(fwd, speed);
    if (this.input.backward) this.position.addScaledVector(fwd, -speed);
    if (this.input.left) this.position.addScaledVector(rgt, -speed);
    if (this.input.right) this.position.addScaledVector(rgt, speed);
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

  /** Position the camera for FPV or TPV mode. */
  _applyViewSettings() {
    if (!this.model) return;

    if (this.isTopDown) {
      // Vue de dessus (Top-Down)
      this.camera.position.set(TOP_OFFSET.x, TOP_OFFSET.y, TOP_OFFSET.z);
      this.camera.rotation.set(-Math.PI / 2, 0, 0); // Regarder vers le bas
      this.model.visible = true;
    } else if (this.isFPV) {
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
export function Player({ walls }) {
  const { scene, camera, gl } = useThree();
  const playerRef = useRef(null);

  useEffect(() => {
    const player = new PlayerCharacter(scene, camera, gl.domElement);
    player.walls = walls || null;
    player.load();
    playerRef.current = player;

    return () => player.dispose();
  }, [scene, camera, gl, walls]);

  useFrame((_, delta) => {
    if (playerRef.current) {
      playerRef.current.update(delta);
    }
  });

  return null;
}
