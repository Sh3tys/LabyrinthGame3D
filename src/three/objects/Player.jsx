import React, { useEffect, useRef } from "react";
import * as THREE from "three";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";
import { InputController } from "../controls/InputController.js";
import { AnimationController } from "../utils/AnimationController.js";

// constants moved outside of a class for easier reuse
const MODEL_PATH = "../../assets/playerModel/playerModel.fbx";
const WALK_PATH = "../../assets/playerModel/playerAnimationWalk.fbx";
const IDLE_PATH = "../../assets/playerModel/playerAnimationStop.fbx";

const MOVE_SPEED = 5;
const MOUSE_SENSITIVITY = 0.002;
const PITCH_LIMIT = Math.PI / 2.2;
const FALLBACK_EYE_HEIGHT = 1.6;

const TPV_OFFSET = new THREE.Vector3(0, 1.2, 3.5);

/**
 * React component that manages a player character inside a Three.js scene.
 *
 * The component does not render any DOM nodes; it merely creates and
 * updates the Three objects that represent the character.  A parent
 * is responsible for calling the `update` callback (passed via
 * `onUpdate`) on every animation frame (for example using
 * @react-three/fiber's useFrame).
 *
 * Props:
 *   scene      - THREE.Scene instance
 *   camera     - Perspective camera used for FPV/TPV
 *   domElement - element to attach the input controller to (usually canvas)
 *   walls      - optional collision provider implementing resolveCollisions()
 *   onUpdate   - optional function that receives the internal update
 *                handler so that callers can integrate it into their
 *                rendering loop.
 */
export function Player({ scene, camera, domElement, walls, onUpdate }) {
  const yawPivot = useRef(new THREE.Object3D());
  const model = useRef(null);
  const animController = useRef(null);
  const input = useRef(null);
  const position = useRef(new THREE.Vector3());
  const pitch = useRef(0);
  const eyeHeight = useRef(FALLBACK_EYE_HEIGHT);
  const isFPV = useRef(true);
  const loaded = useRef(false);

  // helpers ported from the original class methods
  const computeEyeHeight = () => {
    if (!model.current) return;
    model.current.updateMatrixWorld(true);

    let headBone = null;
    model.current.traverse((child) => {
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
      eyeHeight.current = worldPos.y - yawPivot.current.position.y;
      console.log(`[Player] eye height: ${eyeHeight.current.toFixed(2)}m`);
    } else {
      eyeHeight.current = FALLBACK_EYE_HEIGHT;
    }
  };

  const applyViewSettings = () => {
    if (!model.current) return;

    if (isFPV.current) {
      camera.position.set(0, eyeHeight.current, 0);
      model.current.visible = false;
    } else {
      const offset = TPV_OFFSET;
      camera.position.set(offset.x, eyeHeight.current + offset.y, offset.z);
      model.current.visible = true;
    }
  };

  const handleMouseLook = () => {
    if (!input.current?.isPointerLocked) return;
    const { x: dx, y: dy } = input.current.consumeMouseDelta();
    yawPivot.current.rotation.y -= dx * MOUSE_SENSITIVITY;
    pitch.current -= dy * MOUSE_SENSITIVITY;
    pitch.current = Math.max(
      -PITCH_LIMIT,
      Math.min(PITCH_LIMIT, pitch.current),
    );
    camera.rotation.x = pitch.current;
  };

  const handleMovement = (deltaTime) => {
    const isMoving = input.current?.isMoving;

    animController.current?.setMoving(isMoving);

    if (!isMoving) return;

    const speed = MOVE_SPEED * deltaTime;

    const q = yawPivot.current.quaternion;
    const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(q);
    const rgt = new THREE.Vector3(1, 0, 0).applyQuaternion(q);
    fwd.y = 0;
    fwd.normalize();
    rgt.y = 0;
    rgt.normalize();

    if (input.current.forward) position.current.addScaledVector(fwd, speed);
    if (input.current.backward) position.current.addScaledVector(fwd, -speed);
    if (input.current.left) position.current.addScaledVector(rgt, -speed);
    if (input.current.right) position.current.addScaledVector(rgt, speed);
  };

  const updateAnimation = (deltaTime) => {
    animController.current?.update(deltaTime);
  };

  const update = (deltaTime) => {
    if (!loaded.current) return;

    if (input.current?.consumeViewToggle()) {
      isFPV.current = !isFPV.current;
      applyViewSettings();
    }

    handleMouseLook();
    handleMovement(deltaTime);

    if (walls) {
      walls.resolveCollisions(position.current);
    }

    updateAnimation(deltaTime);
    yawPivot.current.position.copy(position.current);
  };

  // make the update function available to the parent
  useEffect(() => {
    if (onUpdate) onUpdate(update);
  }, [onUpdate]);

  useEffect(() => {
    // component mount: replicate constructor logic
    const pivot = yawPivot.current;
    pivot.name = "PlayerYawPivot";
    scene.add(pivot);

    pivot.add(camera);
    camera.rotation.order = "YXZ";

    input.current = new InputController(domElement);

    let cancelled = false;
    const loader = new FBXLoader();

    const loadModels = async () => {
      try {
        console.log("[Player] loading model...");
        const skinObject = await loader.loadAsync(MODEL_PATH);
        if (cancelled) return;

        model.current = skinObject;
        model.current.name = "PlayerSkin";
        model.current.scale.setScalar(0.01);
        model.current.rotation.y = Math.PI;

        if (skinObject.animations?.length) {
          console.log(
            `[Player] ${skinObject.animations.length} animations found:`,
            skinObject.animations.map((a) => a.name),
          );
        }

        skinObject.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
            if (child.material) {
              const mats = Array.isArray(child.material)
                ? child.material
                : [child.material];
              mats.forEach((m) => {
                m.roughness = 0.7;
                m.metalness = 0.3;
              });
            }
          }
        });

        pivot.add(model.current);
        animController.current = new AnimationController(model.current);

        console.log("[Player] loading external animations...");
        const [idleFBX, walkFBX] = await Promise.all([
          loader.loadAsync(IDLE_PATH).catch(() => ({ animations: [] })),
          loader.loadAsync(WALK_PATH).catch(() => ({ animations: [] })),
        ]);

        if (idleFBX.animations.length > 0)
          animController.current.addAction("idle", idleFBX.animations[0]);
        if (walkFBX.animations.length > 0)
          animController.current.addAction("walk", walkFBX.animations[0]);

        if (skinObject.animations.length > 0) {
          skinObject.animations.forEach((anim) => {
            const name = anim.name.toLowerCase();
          });
        }

        computeEyeHeight();
        applyViewSettings();

        loaded.current = true;
        console.log("[Player] model and animations loaded.");
      } catch (err) {
        if (!cancelled) console.error("[Player] loading error:", err);
      }
    };

    loadModels();

    return () => {
      cancelled = true;
      input.current?.dispose();
      animController.current?.dispose();
      scene.remove(pivot);
    };
  }, [scene, camera, domElement, walls]);

  // the component doesn't render any visible element
  return null;
}

// export the legacy class for any remaining code that uses it
export class PlayerCharacter {}
