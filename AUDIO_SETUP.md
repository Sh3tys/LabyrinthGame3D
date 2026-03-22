# AudioManager Integration Guide

## Overview
The AudioManager handles three types of audio:
1. **Background Sound** - Loops automatically when game starts
2. **Walk Sound** - Loops while player moves, stops looping when player stops
3. **Event Sounds** - Random sounds played at random intervals

## Audio File Structure
Your public folder should have this structure:
```
public/
  sounds/
    backgroundSound/
      background.mp3
    walkSound/
      walk.mp3
    eventSound/
      sound1.mp3
      sound2.mp3
      sound3.mp3
      ... (add all your event sounds here)
```

## Integration Steps

### 1. Update Event Sound Files List
Edit `src/three/utils/AudioManager.js` and update the `loadEventSounds()` method with your actual file names:

```javascript
async loadEventSounds() {
  try {
    const eventSoundFiles = [
      "doorCreak.mp3",
      "whisper.mp3",
      "footsteps.mp3",
      "ambient.mp3",
      // Add all your event sound filenames
    ];
    // ... rest of method
  }
}
```

### 2. Initialize AudioManager in GameGUI
Import and initialize the AudioManager when the game GUI mounts:

```javascript
import { audioManager } from "../three/utils/AudioManager";

componentDidMount() {
  prewarmPlayerAssets();
  audioManager.init(); // Initialize audio
}
```

### 3. Start Background Sound When Game Starts
In the `startGame()` method, add background sound:

```javascript
startGame() {
  this.setState({ isPlaying: true, elapsedSeconds: 0, hasWon: false });
  audioManager.playBackgroundSound(); // Start background music
  this.timerInterval = setInterval(() => {
    this.setState((prev) => ({ elapsedSeconds: prev.elapsedSeconds + 1 }));
  }, 1000);
}
```

### 4. Control Walk Sound on Player Movement
In your player movement/input controller, call:

```javascript
// When player starts moving
audioManager.startWalkSound();

// When player stops moving
audioManager.stopWalkSound();
```

For example, if you're using an InputController or similar:
```javascript
// On key press (start moving)
if (keysPressed[key]) {
  audioManager.startWalkSound();
}

// On key release (stop moving)
if (!keysPressed[key]) {
  audioManager.stopWalkSound();
}
```

### 5. Clean Up on Game Exit
In the `handleGameExit()` or component cleanup:

```javascript
handleGameExit() {
  if (this.timerInterval) clearInterval(this.timerInterval);
  audioManager.dispose(); // Clean up audio
  this.setState({ hasWon: true });
}

componentWillUnmount() {
  if (this.timerInterval) clearInterval(this.timerInterval);
  audioManager.dispose(); // Important cleanup
}
```

## API Reference

### Initialization
```javascript
await audioManager.init();
```

### Background Sound
```javascript
audioManager.playBackgroundSound();  // Play and auto-loop
audioManager.stopBackgroundSound();  // Stop background music
```

### Walk Sound
```javascript
audioManager.startWalkSound();  // Start walk loop
audioManager.stopWalkSound();   // Stop looping (current sound finishes)
```

### Event Sounds
Event sounds are automatic - they start after initialization and play randomly with gaps between them. Manual control:
```javascript
audioManager.playRandomEventSound();    // Play one random event now
audioManager.scheduleNextEventSound();  // Schedule next event
```

### Configuration
```javascript
// Adjust timing between event sounds (in milliseconds)
audioManager.eventIntervalMin = 10000;  // 10 seconds minimum
audioManager.eventIntervalMax = 60000;  // 60 seconds maximum

// Volume control
audioManager.setMasterVolume(0.5);      // 50% volume

// Enable/disable all audio
audioManager.setAudioEnabled(false);    // Disable
audioManager.setAudioEnabled(true);     // Enable
```

### Cleanup
```javascript
audioManager.dispose();  // Call on game end or unmount
```

## Notes
- Walk sound: Finishes current playback but won't loop again when stopped
- Background sound: Automatically replays from the beginning when finished
- Event sounds: Only one plays at a time, with random gaps (15-45 seconds by default)
- All audio is played at 70% volume by default - adjust in the `_playAudioBuffer` method
