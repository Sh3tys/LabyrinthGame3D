/**
 * mainPlayer.js
 * -------------
 * Re-exports the Player component and PlayerCharacter class
 * from Player.jsx for convenience.
 *
 * - Use <Player /> in React/R3F code (inside a <Canvas>).
 * - Use PlayerCharacter directly for non-React / imperative usage.
 */

import { Player, PlayerCharacter } from "../Player.jsx";

export { Player, PlayerCharacter };
