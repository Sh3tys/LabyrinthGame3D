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

### 2. **Joueur et Animations**

Le joueur est composé:

- un modèle 3D
- animations (marche, idle)
- systeme de deplacement (configurable)
- système de collision
- changement de vue (FPS, TPS, Topview)

### 3. **Configurations** ⌨️

| Touche (defaut) | Action                                 |
| --------------- | -------------------------------------- |
| **ZQSD**        | Mouvement                              |
| **V**           | Basculer entre vue FPS / TPS / Topview |
| **Échap**       | Menu pause                             |

### 4. **GUI**

Nos GUI sont composés :

- Ecran de chargement
- Menu principal
- Chronometre et FPS
- Menu de pause
- Menu de fin
- Menu de paramètres

### 5. **Gameplay** 🏁

- Objectif : Trouver la sortie du labyrinthe
- Score : base sur le Chronometre
- Rejouabilité : apres la fin de partie / recommencer
- Generation : creation dymanique du labyrinthe
- SFX : son ambiant, son de pas du joueur, son aleatoire d'evenement

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
