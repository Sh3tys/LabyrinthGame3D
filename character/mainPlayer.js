import { PlayerCharacter } from './PlayerCharacter.js';

/**
 * Initialise et retourne une instance du joueur.
 * 
 * @param {THREE.Scene} scene - La scène Three.js
 * @param {THREE.PerspectiveCamera} camera - La caméra
 * @param {HTMLElement} domElement - L'élément DOM pour les entrées (un canvas)
 * @param {Object} [collisionsProvider] - Objet optionnel fournissant une méthode resolveCollisions(position)
 * @returns {PlayerCharacter}
 */
export function createPlayer(scene, camera, domElement, collisionsProvider = null) {
    return new PlayerCharacter(scene, camera, domElement, collisionsProvider);
}

export { PlayerCharacter };
