import * as THREE from "three";

// ─── Texture loader singleton ─────────────────────────────────
const textureLoader = new THREE.TextureLoader();

/**
 * Loads an sRGB texture with wrapping and repeat settings
 */
export function loadTexture(path, repeat = [1, 1]) {
  const tex = textureLoader.load(path);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeat[0], repeat[1]);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Loads a linear texture (normal maps, roughness, etc.) with wrapping and repeat settings
 * These must NOT use sRGB color space
 */
export function loadLinearTexture(path, repeat = [1, 1]) {
  const tex = textureLoader.load(path);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeat[0], repeat[1]);
  return tex;
}

/**
 * Builds a textured MeshStandardMaterial with multiple maps
 */
export function buildTexturedMaterial(texDefs, repeatXY, options = {}) {
  const r = repeatXY;
  const mat = new THREE.MeshStandardMaterial({
    map: loadTexture(texDefs.map, r),
    aoMap: loadLinearTexture(texDefs.aoMap, r),
    normalMap: loadLinearTexture(texDefs.normalMap, r),
    roughnessMap: loadLinearTexture(texDefs.roughnessMap, r),
    // displacement is expensive on instanced meshes — skip by default
    roughness: 0.85,
    metalness: 0.02,
    side: THREE.FrontSide,
    ...options,
  });
  return mat;
}
