/**
 * AudioManager - Simple game audio manager
 * Manages: Background music, Walk sounds, Event sounds
 */

class AudioManager {
  constructor() {
    // Audio context
    this.audioContext = null;
    this.initialized = false;

    // Background music
    this.backgroundAudio = null;
    this.backgroundSource = null;
    this.backgroundGain = null;

    // Walk sound
    this.walkAudio = null;
    this.isWalking = false;
    this.walkSource = null;
    this.walkGain = null;

    // Event sounds
    this.eventSounds = [];
    this.eventTimeout = null;
    this.isEventPlaying = false;

    // Volume (0 to 1)
    this.backgroundVolume = 0.5;
    this.walkVolume = 0.5;
    this.eventVolume = 0.5;
  }

  // Initialize audio system
  async init() {
    if (this.initialized) return;

    this.audioContext = new (
      window.AudioContext || window.webkitAudioContext
    )();

    // Resume audio if suspended
    if (this.audioContext.state === "suspended") {
      this.audioContext.resume();
    }

    // Load event sounds
    this.loadEventSounds();
    this.initialized = true;
  }

  // Load all event sound files
  loadEventSounds() {
    const files = Array.from(
      { length: 13 },
      (_, i) => `eventSound-${i + 1}.mp3`,
    );

    files.forEach((filename) => {
      const audio = new Audio();
      audio.src = `/sounds/eventSound/${filename}`;
      this.eventSounds.push(audio);
    });

    // Start scheduling events after delay
    setTimeout(() => this.scheduleEvent(), 1500);
  }

  // Fetch and decode audio file
  async loadAudioFile(path) {
    const response = await fetch(path);
    const arrayBuffer = await response.arrayBuffer();
    return this.audioContext.decodeAudioData(arrayBuffer);
  }

  // Play background music (loops)
  async playBackgroundSound() {
    if (!this.audioContext) return;

    try {
      // Stop previous
      if (this.backgroundSource) {
        this.backgroundSource.stop();
      }

      this.backgroundAudio = await this.loadAudioFile(
        "/sounds/backgroundSound.mp3",
      );

      const source = this.audioContext.createBufferSource();
      const gain = this.audioContext.createGain();

      source.buffer = this.backgroundAudio;
      source.loop = true;
      gain.gain.value = this.backgroundVolume;

      source.connect(gain);
      gain.connect(this.audioContext.destination);
      source.start(0);

      this.backgroundSource = source;
      this.backgroundGain = gain;

      // Replay when finished
      source.onended = () => {
        this.playBackgroundSound();
      };
    } catch {
      console.log("Error: Could not load background sound");
    }
  }

  // Stop background music
  stopBackgroundSound() {
    if (this.backgroundSource) {
      this.backgroundSource.stop();
      this.backgroundSource = null;
    }
  }

  // Play walk sound (loops while moving)
  async startWalkSound() {
    if (!this.audioContext || this.isWalking) return;

    try {
      if (!this.walkAudio) {
        this.walkAudio = await this.loadAudioFile("/sounds/walkSound.mp3");
      }

      this.isWalking = true;

      const source = this.audioContext.createBufferSource();
      const gain = this.audioContext.createGain();

      source.buffer = this.walkAudio;
      source.loop = true;
      gain.gain.value = this.walkVolume * 0.35;

      source.connect(gain);
      gain.connect(this.audioContext.destination);
      source.start(0);

      this.walkSource = source;
      this.walkGain = gain;

      // Loop if still walking
      source.onended = () => {
        if (this.isWalking) this.startWalkSound();
      };
    } catch {
      this.isWalking = false;
    }
  }

  // Stop walk sound
  stopWalkSound() {
    this.isWalking = false;
    if (this.walkSource) {
      this.walkSource.stop();
      this.walkSource = null;
    }
  }

  // Schedule next event sound
  scheduleEvent() {
    if (this.eventSounds.length === 0) return;

    clearTimeout(this.eventTimeout);
    const delay = Math.random() * 20000 + 10000; // 10-30 seconds

    this.eventTimeout = setTimeout(() => {
      if (!this.isEventPlaying) {
        this.playRandomEventSound();
      } else {
        this.scheduleEvent();
      }
    }, delay);
  }

  // Play random event sound
  playRandomEventSound() {
    if (this.eventSounds.length === 0 || this.isEventPlaying) return;

    const audio =
      this.eventSounds[Math.floor(Math.random() * this.eventSounds.length)];

    if (!audio) return;

    this.isEventPlaying = true;
    audio.currentTime = 0;
    audio.volume = this.eventVolume;

    audio.play().catch(() => {
      this.isEventPlaying = false;
      this.scheduleEvent();
    });

    audio.onended = () => {
      this.isEventPlaying = false;
      this.scheduleEvent();
    };
  }

  // Pause events
  pauseEvents() {
    clearTimeout(this.eventTimeout);
    if (this.isEventPlaying) {
      const current = this.eventSounds.find(
        (a) => !a.paused && a.currentTime > 0,
      );
      if (current) {
        current.pause();
        current.currentTime = 0;
      }
      this.isEventPlaying = false;
    }
  }

  // Resume events
  resumeEvents() {
    this.scheduleEvent();
  }

  // Volume controls
  setBackgroundVolume(volume) {
    this.backgroundVolume = Math.max(0, Math.min(1, volume));
    if (this.backgroundGain) {
      this.backgroundGain.gain.value = this.backgroundVolume;
    }
  }

  setWalkVolume(volume) {
    this.walkVolume = Math.max(0, Math.min(1, volume));
    if (this.walkGain) {
      this.walkGain.gain.value = this.walkVolume * 0.35;
    }
  }

  setEventVolume(volume) {
    this.eventVolume = Math.max(0, Math.min(1, volume));
    this.eventSounds.forEach((audio) => {
      audio.volume = this.eventVolume;
    });
  }

  setMasterVolume(volume) {
    this.setBackgroundVolume(volume);
    this.setWalkVolume(volume);
    this.setEventVolume(volume);
  }

  // Resume audio context after user interaction
  async resumeAudioContext() {
    if (!this.audioContext || this.audioContext.state === "running") return;
    try {
      if (this.audioContext.state === "suspended") {
        await this.audioContext.resume();
      }
    } catch {
      // Silent fail
    }
  }

  // Cleanup
  dispose() {
    this.stopBackgroundSound();
    this.stopWalkSound();
    this.pauseEvents();

    if (this.audioContext?.state !== "closed") {
      this.audioContext?.close();
    }

    this.audioContext = null;
    this.initialized = false;
  }
}

// Export singleton
export const audioManager = new AudioManager();
export default AudioManager;
