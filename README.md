# 🎮 Labyrinth Game 3D

Un jeu de labyrinthe 3D immersif développé avec **React**, **Three.js** et **Vite**. Explorez un environnement 3D complexe, naviguez à travers des labyrinthes générés dynamiquement, et chronométrez votre progression jusqu'à la sortie.

---

## 📋 Table des matières

1. [Installation](#installation)
2. [À propos du projet](#à-propos-du-projet)
3. [Fonctionnalités](#fonctionnalités)
4. [Structure du projet](#structure-du-projet)
5. [Architecture technique](#architecture-technique)
6. [Guide de développement](#guide-de-développement)
7. [Scripts disponibles](#scripts-disponibles)

---

## 🚀 Installation

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

## 📖 À propos du projet

**Labyrinth Game 3D** est un jeu vidéo en first-person (FPS) et third-person (TPS) où le joueur doit naviguer dans un labyrinthe 3D complexe pour trouver la sortie. Le jeu intègre une scène 3D avec textures réalistes, un personnage animé avec déplacement et contrôles immersifs, un système de collision avancé, et bien d'autres fonctionnalités immersives.

---

## ✨ Fonctionnalités

### 1. **Environnement 3D** 🏗️

L'environnement est composé d'un labyrinthe 3D avec :

- **Murs** : Construit à partir de modules générés dynamiquement avec textures réalistes
- **Sol** : Texture PBR (Physically Based Rendering) avec détails de déplacement
- **Plafond** : Limite visible du labyrinthe avec textures appropriées
- **Éclairage** : Ambiance 3D avec lumière ambiante et éventuellement des sources de lumière dynamiques

**Fichiers principaux** :

- [src/three/objects/Labyrinth.jsx](src/three/objects/Labyrinth.jsx) - Génération du labyrinthe
- [src/three/objects/MazeModules.js](src/three/objects/MazeModules.js) - Modules de construction du maze

### 2. **Joueur et Animations** 👤

Le joueur est un personnage 3D animé qui :

- Se déplace avec fluidité dans l'environnement
- Possède des animations (marche, arrêt, transitions)
- Est visible en vue troisième personne
- Disparaît en vue première personne (voir à travers les yeux du joueur)

**Fichiers principaux** :

- [src/three/objects/Player.jsx](src/three/objects/Player.jsx) - Classe PlayerCharacter
- [src/three/objects/character/mainPlayer.js](src/three/objects/character/mainPlayer.js) - Modèle et assets du joueur

### 3. **Système de Collision** 💥

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
| **V**           | Basculer entre vue FPS / TPS                 |
| **P**           | Pause / Reprendre                            |
| **Échap**       | Menu principal / Retour au jeu               |

**Fichiers principaux** :

- [src/three/controls/InputController.js](src/three/controls/InputController.js) - Gestion des entrées
- [src/utils/KeyBindings.js](src/utils/KeyBindings.js) - Raccourcis clavier configurable

### 5. **Système de Caméra** 📷

Deux modes de caméra interchangeables :

#### 🎥 Vue Première Personne (FPS)

- Position : Yeux du joueur (hauteur ~1.6m)
- Contrôle : Souris pour la rotation (pitch/yaw)
- Vue : Immersive, le joueur voit son environnement direct
- Modèle : Invisible (rayon de vue depuis les yeux)

#### 🎥 Vue Troisième Personne (TPS)

- Position : Derrière et au-dessus du joueur
- Offset : ~1.2m de haut, ~3.5m de recul
- Suivi : Smoothing pour un suivi fluide
- Modèle : Visible et animé
- Transition : Fadeout du modèle quand la caméra se rapproche

**Échange de vue** :

- Appui sur **V** bascule entre les deux modes
- Cooldown de 0.08s pour éviter les basculements rapides
- Délai de grâce de 0.2s après basculement vers TPS

**Fichiers principaux** :

- [src/three/objects/Player.jsx](src/three/objects/Player.jsx) - Logique de caméra dans PlayerCharacter

### 6. **Chronométrage** ⏱️

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

- Quand le joueur sort du volume du labyrinthe
- Enregistrement du temps final
- Affichage de l'écran de victoire avec score

**Menu de victoire** :

- Affichage du temps final
- Bouton "Rejouer" pour relancer une nouvelle partie
- Bouton "Menu principal" pour retourner au menu
- Réinitialisation de tous les états (score, position, etc.)

**Rejouabilité** :

- Génération nouvelle du labyrinthe à chaque partie
- Position de spawn aléatoire (ou dynamique)
- Tous les assets rechargés proprement

**Fichiers principaux** :

- [src/components/GameGUI.jsx](src/components/GameGUI.jsx) - Gestion des états de jeu
- [src/three/scenes/LabyrinthScene.jsx](src/three/scenes/LabyrinthScene.jsx) - Détection et intégration de victoire

### 8. **Bonus : Labyrinthe Généré Dynamiquement** 🎲

Le labyrinthe est **généré procéduralement** à chaque partie :

**Algorithme** :

- Utilise un système modulaire (`ModuleFactory`) pour créer des tuiles de labyrinthe
- Chaque module représente une section du maze
- Les modules s'assemblent selon une grille logique pour former le labyrinthe complet

**Variabilité** :

- Possibilité de sélectionner un "seed" pour rejouer un labyrinthe spécifique
- Les murs, positions spawn, et sorties sont calculés procéduralement
- Peut générer des labyrinthes de tailles différentes

**Rejouabilité** :

- À chaque nouvelle partie, un labyrinthe unique est généré
- Option menu pour sélectionner un seed spécifique et rejouer un niveau

**Fichiers principaux** :

- [src/three/objects/MazeModules.js](src/three/objects/MazeModules.js) - Factory de génération de modules
- [src/three/objects/Labyrinth.jsx](src/three/objects/Labyrinth.jsx) - Orchestration et assemblage du labyrinthe

### 9. **Audio Immersif** 🎵

Système audio complet :

- **Musique de fond** : Boucle continue pendant la partie
- **Bruitages de pas** : Joué pendant le déplacement du joueur
- **Effets sonores** : Sons aléatoires pour plus d'immersion
- **Contrôle de volume** : Indépendant pour chaque catégorie (musique, pas, effets)
- **Pause audio** : Synchrone avec la pause du jeu

**Fichiers principaux** :

- [src/three/utils/AudioManager.js](src/three/utils/AudioManager.js) - Gestion centralisée de l'audio

---
