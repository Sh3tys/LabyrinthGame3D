import * as THREE from 'three';
import { Ground } from './Ground.js';
import { PlayerCharacter } from '../PlayerCharacter.js';
import { Walls } from './Walls.js';
import { Mirror } from './Mirror.js';

/**
 * World
 * -----
 * Orchestre la scène Three.js :
 *   - Renderer
 *   - Scène + éclairage
 *   - Sol de test
 *   - PlayerCharacter
 *   - Boucle de rendu (requestAnimationFrame)
 */
export class World {
  // ─── Attributes ────────────────────────────────────────────────────────────

  /** @type {THREE.WebGLRenderer} */
  #renderer;

  /** @type {THREE.Scene} */
  #scene;

  /** @type {THREE.PerspectiveCamera} */
  #camera;

  /** @type {Ground} */
  #ground;

  /** @type {PlayerCharacter} */
  #player;

  /** @type {THREE.Clock} */
  #clock;

  /** @type {number | null} RAF id */
  #rafId = null;

  /** @type {Walls} */
  #walls;

  /** @type {Mirror} */
  #mirror;

  /**
   * @param {HTMLCanvasElement} canvas
   */
  constructor(canvas) {
    this.#clock = new THREE.Clock();

    // ── Renderer ──────────────────────────────────────────────────────────────
    this.#renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.#renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.#renderer.setSize(window.innerWidth, window.innerHeight);
    this.#renderer.shadowMap.enabled = true;
    this.#renderer.shadowMap.type    = THREE.PCFSoftShadowMap;
    this.#renderer.toneMapping       = THREE.ACESFilmicToneMapping;
    this.#renderer.toneMappingExposure = 1.2;

    // ── Scène ─────────────────────────────────────────────────────────────────
    this.#scene = new THREE.Scene();
    this.#scene.background = new THREE.Color(0x0d0d1a);
    this.#scene.fog = new THREE.FogExp2(0x0d0d1a, 0.02);

    // ── Caméra ────────────────────────────────────────────────────────────────
    this.#camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.01,
      200,
    );
    // La caméra sera repositionnée par PlayerCharacter une fois le modèle chargé

    // ── Éclairage ─────────────────────────────────────────────────────────────
    this._setupLighting();

    // ── Sol ───────────────────────────────────────────────────────────────────
    this.#ground = new Ground(this.#scene);

    // ── Murs et Miroir ──────────────────────────────────────────────────────
    this.#walls = new Walls(this.#scene);
    this.#mirror = new Mirror(this.#scene);

    // ── Joueur ────────────────────────────────────────────────────────────────
    this.#player = new PlayerCharacter(this.#scene, this.#camera, canvas, this.#walls);

    // ── Resize ────────────────────────────────────────────────────────────────
    window.addEventListener('resize', this._onResize.bind(this));

    // ── Démarrage ─────────────────────────────────────────────────────────────
    this._animate();
  }

  // ─── Private methods ───────────────────────────────────────────────────────

  /**
   * Configure lumières : ambiante, directionnelle, fill.
   */
  _setupLighting() {
    // Lumière ambiante (ambiance sombre)
    const ambient = new THREE.AmbientLight(0xffffff, 4.0);
    this.#scene.add(ambient);

    // Lumière directionnelle principale (soleil)
    const dirLight = new THREE.DirectionalLight(0xffffff, 3.5);
    dirLight.position.set(10, 20, 10);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width  = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 0.1;
    dirLight.shadow.camera.far  = 100;
    dirLight.shadow.camera.left   = -30;
    dirLight.shadow.camera.right  =  30;
    dirLight.shadow.camera.top    =  30;
    dirLight.shadow.camera.bottom = -30;
    this.#scene.add(dirLight);

    // Lumière de remplissage (fill) — éclaire l'avant du joueur
    const fillLight = new THREE.DirectionalLight(0xaaccff, 2.0);
    fillLight.position.set(-5, 8, 5);
    this.#scene.add(fillLight);

    // Lumière de remplissage côté (warm)
    const warmLight = new THREE.PointLight(0xffe0aa, 2.0, 60);
    warmLight.position.set(5, 5, 5);
    this.#scene.add(warmLight);

    // Hemi light (ciel / sol)
    const hemi = new THREE.HemisphereLight(0xddeeff, 0x444422, 2.0);
    this.#scene.add(hemi);
  }

  /**
   * Ajoute un GridHelper léger pour le repérage spatial.
   */
  _addGridHelper() {
    const grid = new THREE.GridHelper(100, 50, 0x334466, 0x222233);
    grid.position.y = 0.001; // légèrement au-dessus du sol pour éviter le z-fighting
    this.#scene.add(grid);
  }

  /**
   * Boucle de rendu.
   */
  _animate() {
    this.#rafId = requestAnimationFrame(this._animate.bind(this));

    const deltaTime = Math.min(this.#clock.getDelta(), 0.05); // cap à 50ms

    // Mise à jour du joueur
    this.#player.update(deltaTime);

    // Rendu
    this.#renderer.render(this.#scene, this.#camera);
  }

  /**
   * Gestion du redimensionnement de la fenêtre.
   */
  _onResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;

    this.#camera.aspect = w / h;
    this.#camera.updateProjectionMatrix();
    this.#renderer.setSize(w, h);
  }

  // ─── Public API ────────────────────────────────────────────────────────────

  /**
   * Stoppe la boucle de rendu et libère les ressources.
   */
  dispose() {
    if (this.#rafId !== null) cancelAnimationFrame(this.#rafId);
    this.#player.dispose();
    this.#ground.dispose();
    window.removeEventListener('resize', this._onResize.bind(this));
    this.#renderer.dispose();
  }
}
