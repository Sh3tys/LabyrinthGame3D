# 🎵 Quick Audio Setup - 5 Minutes

## Step 1: File Structure
Make sure your sounds are organized like this:
```
public/
  sounds/
    backgroundSound/
      background.mp3          (your background music file)
    walkSound/
      walk.mp3                (your footstep sound file)  
    eventSound/
      event1.mp3              (your event sounds)
      event2.mp3
      event3.mp3
      ... (add more event sounds)
```

## Step 2: Update Event Sound List
**Open:** `src/three/utils/AudioManager.js`

Find this line (around line 62):
```javascript
const eventSoundFiles = [
  "sound1.mp3",
  "sound2.mp3",
  "sound3.mp3",
  // Add all your event sound filenames
];
```

**Replace it with your actual file names:**
```javascript
const eventSoundFiles = [
  "creepy_whisper.mp3",
  "ghost_sound.mp3",
  "door_creak.mp3",
  "wind_howl.mp3",
  "mysterious_laugh.mp3",
  // Add all your actual event sound files
];
```

## Step 3: Update GameGUI.jsx
**Open:** `src/components/GameGUI.jsx`

**Step 3a:** Add this import at the top:
```javascript
import { audioManager } from "../three/utils/AudioManager";
```

**Step 3b:** In `componentDidMount()`, add:
```javascript
componentDidMount() {
  prewarmPlayerAssets();
  audioManager.init();  // ← Add this line
}
```

**Step 3c:** In `startGame()`, add:
```javascript
startGame() {
  this.setState({ isPlaying: true, elapsedSeconds: 0, hasWon: false });
  audioManager.playBackgroundSound();  // ← Add this line
  this.timerInterval = setInterval(() => {
    this.setState((prev) => ({ elapsedSeconds: prev.elapsedSeconds + 1 }));
  }, 1000);
}
```

**Step 3d:** In `handleGameExit()`, add:
```javascript
handleGameExit() {
  if (this.timerInterval) clearInterval(this.timerInterval);
  audioManager.dispose();  // ← Add this line
  this.setState({ hasWon: true });
}
```

**Step 3e:** In `componentWillUnmount()`, add:
```javascript
componentWillUnmount() {
  if (this.timerInterval) clearInterval(this.timerInterval);
  audioManager.dispose();  // ← Add this line
}
```

## Step 4: Control Walk Sound (Optional)
**Open:** `src/three/controls/InputController.js`

At the top, add this import:
```javascript
import { audioManager } from "../utils/AudioManager";
```

Find where you handle input updates (typically in a game loop or useFrame), and add:
```javascript
// Check if player is moving
if (inputController.isMoving) {
  audioManager.startWalkSound();
} else {
  audioManager.stopWalkSound();
}
```

**OR** if you're using the InputController in a React component (like LabyrinthScene), add to your useFrame:
```javascript
useFrame(() => {
  const isMoving = inputController.isMoving;
  
  if (isMoving && !prevMovingRef.current) {
    audioManager.startWalkSound();
  } else if (!isMoving && prevMovingRef.current) {
    audioManager.stopWalkSound();
  }
  
  prevMovingRef.current = isMoving;
});
```

## Done! 🎉

**What happens:**
- ✅ Background music plays when game starts and loops automatically
- ✅ Walk sound plays in a loop while player moves, stops looping when they stop
- ✅ Random event sounds play at random intervals (every 15-45 seconds)

## Customize Audio Timing (Optional)

If you want to change when event sounds play, edit in `AudioManager.js`:
```javascript
this.eventIntervalMin = 15000;  // Min time between events (milliseconds)
this.eventIntervalMax = 45000;  // Max time between events
```

Examples:
- Every 5-10 seconds: `Min: 5000, Max: 10000`
- Every 30-60 seconds: `Min: 30000, Max: 60000`

## Troubleshooting

**No sound playing?**
1. Check browser console for errors
2. Make sure CORS is not blocking your sound files (they're in public folder, so should be fine)
3. Check file names match exactly in AudioManager.js
4. Try opening browser DevTools → Console to see any error messages

**Walk sound keeps repeating?**
- Make sure you're calling `audioManager.stopWalkSound()` when player stops moving

**Event sounds not playing?**
- Check that `eventSoundFiles` in AudioManager.js lists your actual folder file names
- First time might take a moment to load all sounds
