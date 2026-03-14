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
  loadCached(MODEL_PATH, "model").catch(() => null);
  loadCached(IDLE_PATH, "idle").catch(() => null);
  loadCached(WALK_PATH, "walk").catch(() => null);
}
