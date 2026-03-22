import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";

const MODEL_PATH = "/models/player/playerModel.fbx";
const WALK_PATH = "/models/player/playerAnimationWalk.fbx";
const IDLE_PATH = "/models/player/playerAnimationStop.fbx";

const sharedLoader = new FBXLoader();

export const assetCache = {
  model: null,
  idle: null,
  walk: null,
};

export function loadCached(path, key) {
  if (!assetCache[key]) {
    assetCache[key] = sharedLoader.loadAsync(path).catch((err) => {
      assetCache[key] = null;
      throw err;
    });
  }
  return assetCache[key];
}

export function prewarmPlayerAssets() {
  // Return a promise that waits for all assets to preload
  // Each load has a max 10 second timeout to prevent hanging
  const loadWithTimeout = (path, key, timeout = 10000) => {
    return Promise.race([
      loadCached(path, key).catch(() => null),
      new Promise((resolve) => setTimeout(() => resolve(null), timeout))
    ]);
  };

  return Promise.all([
    loadWithTimeout(MODEL_PATH, "model"),
    loadWithTimeout(IDLE_PATH, "idle"),
    loadWithTimeout(WALK_PATH, "walk"),
  ]);
}
