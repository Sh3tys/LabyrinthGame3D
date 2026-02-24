/**
 * character/main.js
 * -----------------
 * Point d'entrée du mode "Character Test".
 * Lance le World sur le canvas.
 */
import { World } from './World.js';

// Récupère le canvas
const canvas = document.getElementById('characterCanvas');
if (!canvas) {
  throw new Error('Canvas #characterCanvas introuvable dans le DOM.');
}

// Démarre le monde
const world = new World(canvas);

// Hot-reload : nettoyage si Vite HMR
if (import.meta.hot) {
  import.meta.hot.dispose(() => world.dispose());
}
