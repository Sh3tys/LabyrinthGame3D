## Structure du projet

src/
├── components/ # React components (e.g., UI overlays, menus)
│ ├── GameUI.jsx # HUD, menus, etc.
│ └── ...
├── three/ # Three.js-specific logic (scenes, objects, controls)
│ ├── scenes/
│ │ ├── LabyrinthScene.jsx # Main 3D scene component
│ │ └── ...
│ ├── objects/
│ │ ├── Player.jsx # Player component (migrate from PlayerCharacter class)
│ │ └── Wall.jsx # Wall or obstacle components
│ ├── controls/
│ │ ├── InputController.js # Input handling (keep as utility)
│ │ └── ...
│ └── utils/
│ ├── Physics.js # Physics logic
│ └── AnimationController.js # Animation handling
├── hooks/ # Custom React hooks for Three.js
│ ├── usePlayer.js # Hook for player state and updates
│ └── useGameLoop.js # Hook for game loop (deltaTime, updates)
├── assets/ # Models, textures (e.g., FBX files)
├── App.jsx # Main app component (integrate Canvas here)
├── main.jsx # Entry point
└── ...
