import * as THREE from "three";

// ─── Player Configuration ──────────────────────────────────────

// Asset paths
export const MODEL_PATH = "/models/player/playerModel.fbx";
export const WALK_PATH = "/models/player/playerAnimationWalk.fbx";
export const IDLE_PATH = "/models/player/playerAnimationStop.fbx";

// Movement and input
export const MOVE_SPEED = 6.2;
export const MOUSE_SENSITIVITY = 0.002;
export const PITCH_LIMIT = Math.PI / 2.2;
export const ACCEL_RATE = 18;
export const DECEL_RATE = 14;
export const MIN_VELOCITY_EPSILON = 0.01;
export const SMOOTH_FACTOR = 20;
export const MAX_DT = 0.1;

// Camera and view modes
export const FALLBACK_EYE_HEIGHT = 1.6;
export const TPV_OFFSET = new THREE.Vector3(0, 1.2, 3.5);
export const CAMERA_COLLISION_RADIUS = 0.25;
export const CAMERA_COLLISION_HEIGHT = 0.8;
export const CAMERA_ANCHOR_HEIGHT_OFFSET = 0.2;
export const TPV_HIDE_MODEL_DISTANCE = 1.0;
export const TPV_SHOW_MODEL_DISTANCE = 1.25;
export const TPV_CAMERA_SMOOTH = 30;
export const VIEW_SWITCH_COOLDOWN = 0.08;
export const TPV_SWITCH_GRACE = 0.2;
