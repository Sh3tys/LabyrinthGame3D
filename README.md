# Labyrinth Game 3D

Ce jeu est un jeu de labyrinthe 3D immersif développé avec **React**, **Three.js** et **Vite**. Explorez un environnement 3D complexe, naviguez à travers des labyrinthes générés dynamiquement, et chronométrez votre progression jusqu'à la sortie.

---

## Installation

### Prérequis

- Node.js 16+
- npm 8+
- Git avec Git LFS (pour les modèles et textures)

### Étapes d'installation

```bash
# Cloner le dépôt
git clone https://github.com/Sh3tys/LabyrinthGame3D.git
cd LabyrinthGame3D

# Installer Git LFS (si nécessaire)
sudo apt install git-lfs  # Linux
# ou brew install git-lfs  # macOS

# Initialiser Git LFS et télécharger les assets
git lfs install
git lfs pull

# Installer les dépendances npm
npm install

# Lancer le serveur de développement
npm run dev

# Ou build + preview en production
npm run bp
```

---

## Fonctionnalités

### 1. **Environnement 3D**

L'environnement est composé :

- Des murs
- Un sol
- Un Plafond
- Un éclairage

**Fichiers principaux** :

- [src/three/objects/Labyrinth.jsx](src/three/objects/Labyrinth.jsx) - Génération du labyrinthe
- [src/three/objects/MazeModules.js](src/three/objects/MazeModules.js) - Modules de construction du maze

### 2. **Joueur et Animations**

Le joueur est un personnage 3D animé qui :

- Se déplace
- Est visible en vue troisième personne
- Disparaît en vue première personne

**Fichiers principaux** :

- [src/three/objects/Player.jsx](src/three/objects/Player.jsx) - Classe PlayerCharacter
- [src/three/objects/character/mainPlayer.js](src/three/objects/character/mainPlayer.js) - Modèle et assets du joueur

### 3. **Système de Collision**

Un système de collision robuste gère :

- **Collisions murs/joueur** : Empêche le joueur de traverser les murs
- **Collisions caméra** : Smoothing pour éviter les clipping dans les environnements serrés
- **Détection de sortie** : Reconnaît quand le joueur quitte le labyrinthe (victoire)

**Implémentation** :

- La classe `PlayerCharacter` inclut la logique de collision raycasting
- Les murs sont des volumes de collision basés sur les dimensions de la grille du maze

### 4. **Contrôles** ⌨️

Le joueur dispose de contrôles intuitifs :

| Touche          | Action                                       |
| --------------- | -------------------------------------------- |
| **ZQSD / WASD** | Mouvement (haut/bas/gauche/droite)           |
| **Souris**      | Vue à la première personne (rotation caméra) |
| **V**           | Basculer entre vue FPS / TPS / Topview       |
| **P**           | Pause / Reprendre                            |
| **Échap**       | Menu principal / Retour au jeu               |

**Fichiers principaux** :

- [src/three/controls/InputController.js](src/three/controls/InputController.js) - Gestion des entrées
- [src/utils/KeyBindings.js](src/utils/KeyBindings.js) - Raccourcis clavier configurable

### 5. **Système de Caméra**

Trois modes de caméra interchangeables :

#### Vue Première Personne (FPS)

- Position : Yeux du joueur (hauteur ~1.6m)
- Contrôle : Souris pour la rotation (pitch/yaw)
- Vue : Immersive, le joueur voit son environnement direct
- Modèle : Invisible (rayon de vue depuis les yeux)

#### Vue Troisième Personne (TPS)

- Position : Derrière et au-dessus du joueur
- Offset : ~1.2m de haut, ~3.5m de recul
- Suivi : Smoothing pour un suivi fluide
- Modèle : Visible et animé
- Transition : Fadeout du modèle quand la caméra se rapproche

#### Vue Topview

- Position : Vue de dessus du labyrinthe
- Contrôle : Pas de rotation, vue fixe
- Modèle : Visible sur la map

**Échange de vue** :

- Appui sur **V** bascule entre les trois modes
- Cooldown de 0.08s pour éviter les basculements rapides
- Délai de grâce de 0.2s après basculement

**Fichiers principaux** :

- [src/three/objects/Player.jsx](src/three/objects/Player.jsx) - Logique de caméra dans PlayerCharacter

### 6. **Chronométrage**

Un système de chronométrage en temps réel :

- **Démarrage** : À la création de la partie
- **Affichage** : HUD en haut à gauche (minutes:secondes)
- **Pause** : S'arrête lors de la mise en pause du jeu
- **Réinitialisation** : Remet à zéro à chaque nouvelle partie

**Fichiers principaux** :

- [src/components/GameGUI.jsx](src/components/GameGUI.jsx) - Gestion du chrono et de l'état du jeu

### 7. **Fin de Partie et Rejouabilité** 🏁

Système complet de gestion de fin de partie :

**Détection de victoire** :

- Enregistrement du temps final
- Affichage de l'écran de victoire avec score

**Menu de victoire** :

- Affichage du temps final
- Bouton "Rejouer" pour relancer une nouvelle partie
- Bouton "Menu principal" pour retourner au menu
- Réinitialisation de tous les états (score, position, etc.)

**Rejouabilité** :

- Génération nouvelle du labyrinthe à chaque partie

**Fichiers principaux** :

- [src/components/GameGUI.jsx](src/components/GameGUI.jsx) - Gestion des états de jeu
- [src/three/scenes/LabyrinthScene.jsx](src/three/scenes/LabyrinthScene.jsx) - Détection et intégration de victoire

**Fichiers principaux** :

- [src/three/objects/MazeModules.js](src/three/objects/MazeModules.js) - Factory de génération de modules
- [src/three/objects/Labyrinth.jsx](src/three/objects/Labyrinth.jsx) - Orchestration et assemblage du labyrinthe

**Fichiers principaux** :

- [src/three/utils/AudioManager.js](src/three/utils/AudioManager.js) - Gestion centralisée de l'audio

---

## Structure du Projet

```
LabyrinthGame3D/
├── public/                          # Assets publics (modèles, sons, textures)
│   ├── models/
│   │   └── player/                  # Modèles 3D du joueur
│   ├── sounds/
│   │   └── eventSound/              # Effets sonores du jeu
│   └── texture/
│       ├── ground/                  # Textures du sol
│       ├── roof/                    # Textures du plafond
│       └── wall/                    # Textures des murs
│
├── src/
│   ├── components/                  # Composants React UI
│   │   ├── GameGUI.jsx              # Interface de jeu (chrono, score)
│   │   ├── GameGUI.css
│   │   ├── LoadingScreen.jsx        # Écran de chargement
│   │   ├── LoadingScreen.css
│   │   ├── PauseMenu.jsx            # Menu de pause
│   │   ├── PauseMenu.css
│   │   ├── SettingsMenu.jsx         # Menu des paramètres
│   │   └── SettingsMenu.css
│   │
│   ├── hooks/                       # Hooks React personnalisés
│   │   ├── useGameLoop.js           # Boucle de jeu principal
│   │   └── usePlayer.js             # Logique du joueur
│   │
│   ├── three/                       # Code Three.js 3D
│   │   ├── controls/
│   │   │   └── InputController.js   # Gestion des entrées clavier/souris
│   │   │
│   │   ├── objects/                 # Objets 3D du jeu
│   │   │   ├── Labyrinth.jsx        # Génération et orchestration du labyrinthe
│   │   │   ├── MazeModules.js       # Modules de construction du labyrinthe
│   │   │   ├── Player.jsx           # Classe PlayerCharacter (logique caméra)
│   │   │   └── character/
│   │   │       └── mainPlayer.js    # Modèle et assets du joueur
│   │   │
│   │   ├── scenes/
│   │   │   └── LabyrinthScene.jsx   # Scène Three.js principale
│   │   │
│   │   └── utils/                   # Utilitaires Three.js
│   │       ├── AnimationController.js # Contrôle des animations
│   │       ├── AudioManager.js      # Gestion centralisée du son
│   │       └── preloadAssets.js     # Préchargement des assets
│   │
│   ├── utils/                       # Utilitaires généraux
│   │   └── KeyBindings.js           # Configuration des touches clavier
│   │
│   ├── App.jsx                      # Composant principal
│   ├── App.css
│   ├── main.jsx                     # Point d'entrée
│   └── index.css
│
├── index.html                       # HTML d'entrée
├── package.json                     # Dépendances npm
├── vite.config.js                   # Configuration Vite
├── eslint.config.js                 # Configuration ESLint
└── README.md                        # Documentation du projet
```
