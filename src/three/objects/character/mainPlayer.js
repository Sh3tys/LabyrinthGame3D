// mainPlayer.js is still provided for compatibility with non‑React
// code, but in a React/JSX project you should prefer the <Player />
// component exported from ../Player.jsx.

import { Player, PlayerCharacter as LegacyPlayer } from "../Player.jsx";

/**
 * createPlayer
 * -----------
 * Legacy helper that mimicks the old behaviour by constructing the
 * PlayerCharacter class.  It issues a deprecation warning; React code
 * should instead render the <Player> component and call its update
 * method via an onUpdate prop or a useFrame hook.
 */
export function createPlayer(
  scene,
  camera,
  domElement,
  collisionsProvider = null,
) {
  console.warn(
    "createPlayer() is deprecated — please use the <Player> React component instead",
  );
  return new LegacyPlayer(scene, camera, domElement, collisionsProvider);
}

// re-export for anyone still importing directly
export { Player, LegacyPlayer as PlayerCharacter };
