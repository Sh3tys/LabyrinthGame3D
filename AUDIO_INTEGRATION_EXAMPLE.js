/**
 * Example Integration of AudioManager
 * This shows how to integrate the audio system into your existing game
 */

// ============================================
// 1. IN GameGUI.jsx - Initialize and start background sound
// ============================================

/*
import { audioManager } from "../three/utils/AudioManager";

class GameGUI extends Component {
  constructor(props) {
    super(props);
    this.state = {
      isPlaying: false,
      elapsedSeconds: 0,
      hasWon: false,
    };
    this.timerInterval = null;
    this.startGame = this.startGame.bind(this);
    this.handleGameExit = this.handleGameExit.bind(this);
  }

  // Launch 3D game
  startGame() {
    this.setState({ isPlaying: true, elapsedSeconds: 0, hasWon: false });
    
    // ✅ START BACKGROUND SOUND HERE
    audioManager.playBackgroundSound();
    
    this.timerInterval = setInterval(() => {
      this.setState((prev) => ({ elapsedSeconds: prev.elapsedSeconds + 1 }));
    }, 1000);
  }

  handleGameExit() {
    if (this.timerInterval) clearInterval(this.timerInterval);
    
    // ✅ CLEAN UP AUDIO HERE
    audioManager.dispose();
    
    this.setState({ hasWon: true });
  }

  componentDidMount() {
    prewarmPlayerAssets();
    
    // ✅ INITIALIZE AUDIO WHEN COMPONENT MOUNTS
    audioManager.init();
  }

  componentWillUnmount() {
    if (this.timerInterval) clearInterval(this.timerInterval);
    
    // ✅ CLEAN UP ON UNMOUNT
    audioManager.dispose();
  }

  // ... rest of your GameGUI code
}
*/

// ============================================
// 2. IN LabyrinthScene.jsx - Add audio control hook
// ============================================

/*
import { useFrame } from "@react-three/fiber";
import { audioManager } from "../utils/AudioManager";

const LabyrinthScene = ({ onExit }) => {
  // ... existing code ...

  // Track previous movement state
  const prevMovingRef = useRef(false);

  // Use this in your existing useFrame or animation loop
  useFrame(() => {
    // Access from your input controller (you may need to adjust this based on your architecture)
    const isCurrentlyMoving = inputController.isMoving;

    // Start walk sound when player starts moving
    if (isCurrentlyMoving && !prevMovingRef.current) {
      audioManager.startWalkSound();
    }

    // Stop walk sound looping when player stops moving
    if (!isCurrentlyMoving && prevMovingRef.current) {
      audioManager.stopWalkSound();
    }

    prevMovingRef.current = isCurrentlyMoving;
  });

  return (
    // ... existing Canvas code ...
  );
};
*/

// ============================================
// 3. SIMPLE INTEGRATION - If using input controller directly
// ============================================

/*
// In your update loop or game loop handler:
import { audioManager } from "./utils/AudioManager";

function gameLoop(inputController) {
  const isMoving = inputController.isMoving;
  
  // Control walk sound based on movement
  if (isMoving) {
    audioManager.startWalkSound();  // Safe to call repeatedly
  } else {
    audioManager.stopWalkSound();   // Stops looping but finishes current sound
  }
  
  // ... rest of your game loop
}
*/

// ============================================
// 4. EVENT SOUNDS - Automatic, but you can trigger manually
// ============================================

/*
// Event sounds start automatically after audioManager.init()
// Random event sounds play at random intervals (15-45 seconds by default)

// To customize timing:
audioManager.eventIntervalMin = 10000;  // 10 seconds
audioManager.eventIntervalMax = 30000;  // 30 seconds

// To trigger an event sound immediately:
audioManager.playRandomEventSound();
*/

// ============================================
// 5. SETUP YOUR EVENT SOUNDS
// ============================================

/*
IMPORTANT: Update AudioManager.js with your actual sound filenames

In src/three/utils/AudioManager.js, find the loadEventSounds() method:

  async loadEventSounds() {
    try {
      const eventSoundFiles = [
        "sound1.mp3",           // ← Replace with your actual filenames
        "sound2.mp3",
        "creepy_whisper.mp3",
        "door_creak.mp3",
        "mysterious_sound.mp3",
        // Add all your event sounds here
      ];
      // ... rest of method
    }
  }

Make sure your folder structure is:
  public/
    sounds/
      backgroundSound/
        background.mp3
      walkSound/
        walk.mp3
      eventSound/
        sound1.mp3
        sound2.mp3
        (all your event sounds)
*/

export const audioManagerIntegrationExample = {
  message: "See this file for integration examples with your game code",
};
