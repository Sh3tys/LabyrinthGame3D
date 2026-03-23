/**
 * AudioManager - Manages all game audio
 * Handles: Background music (looping), Walk sounds (loop while moving), Event sounds (random)
 */

class AudioManager {
  constructor() {
    // Single shared AudioContext
    this.audioContext = null;

    // Background sound
    this.backgroundAudio = null;
    this.backgroundSource = null;
    this.backgroundGainNode = null;

    // Walk sound
    this.walkAudio = null;
    this.isWalking = false;
    this.walkSource = null;
    this.walkGainNode = null;

    // Event sounds
    this.eventSounds = [];
    this.eventSource = null;
    this.eventTimeout = null;
    this.isEventPlaying = false;
    this.eventIntervalMin = 10000; // Min 10 seconds between events
    this.eventIntervalMax = 30000; // Max 30 seconds between events
    this.eventGainNodes = []; // Store all event sound audio elements for volume control

    // Volume controls (0.0 to 1.0)
    this.backgroundVolume = 0.5; // Default 50%
    this.walkVolume = 0.5; // Default 50%
    this.eventVolume = 0.5; // Default 50%

    // Control flags
    this.audioEnabled = true;
    this.initialized = false;
  }

  /**
   * Initialize AudioManager - call once at game start
   */
  async init() {
    if (this.initialized) return;
    
    try {
      // Create a single shared audio context
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      
      // Try to resume audio context with timeout
      if (this.audioContext.state === 'suspended') {
        try {
          await Promise.race([
            this.audioContext.resume(),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Resume timeout')), 2000))
          ]);
        } catch (e) {
          // Ignore resume errors
        }
      }

      // Load event sounds (non-blocking)
      this.loadEventSounds();

      this.initialized = true;
    } catch (error) {
      this.audioEnabled = false;
      this.initialized = true;
    }
  }

  /**
   * Load all event sounds from the eventSound folder
   */
  async loadEventSounds() {
    const eventSoundFiles = [
        "eventSound-1.mp3",
        "eventSound-2.mp3",
        "eventSound-3.mp3",
        "eventSound-4.mp3",
        "eventSound-5.mp3",
        "eventSound-6.mp3",
        "eventSound-7.mp3",
        "eventSound-8.mp3",
        "eventSound-9.mp3",
        "eventSound-10.mp3",
        "eventSound-11.mp3",
        "eventSound-12.mp3",
        "eventSound-13.mp3",
    ];

    let successCount = 0;
    
    // Create audio elements with proper error handling
    eventSoundFiles.forEach((filename, index) => {
      const audio = new Audio();
      audio.src = `/sounds/eventSound/${filename}`;
      audio.preload = "auto";
      
      // Track if audio loads successfully
      audio.addEventListener('canplay', () => {
        // Sound ready
      }, { once: true });
      
      // Catch load errors
      audio.addEventListener('error', (e) => {
        // Load error - silent fail
      }, { once: true });
      
      // Catch abort errors
      audio.addEventListener('abort', () => {
        // Abort - silent fail
      }, { once: true });
      
      this.eventSounds.push(audio);
    });

    // Start event system after files have time to load
    if (this.eventSounds.length > 0) {
      setTimeout(() => {
        // Event system ready
        this.scheduleNextEventSound();
      }, 1500);
    }
  }

  /**
   * Load a single audio file with detailed error handling
   */
  async loadAudioFile(path) {
    if (!this.audioContext) {
      throw new Error("AudioContext not initialized");
    }
    
    try {
      const response = await fetch(path);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText} - File not found: ${path}`);
      }
      
      const arrayBuffer = await response.arrayBuffer();
      
      if (arrayBuffer.byteLength === 0) {
        throw new Error(`Empty file: ${path}`);
      }
      
      try {
        const decoded = await this.audioContext.decodeAudioData(arrayBuffer);
        return decoded;
      } catch (decodeError) {
        throw new Error(`Failed to decode audio: ${decodeError.message}. File might not be a valid MP3/audio file.`);
      }
    } catch (error) {
      throw error;
    }
  }

  /**
   * Play background sound with automatic looping
   */
  async playBackgroundSound() {
    if (!this.audioEnabled || !this.audioContext) return;

    try {
      // Stop previous background sound if playing
      if (this.backgroundSource) {
        this.backgroundSource.stop();
      }

      if (!this.backgroundAudio) {
        this.backgroundAudio = await this.loadAudioFile("/sounds/backgroundSound.mp3");
      }

      this._playAudioBuffer(
        this.backgroundAudio,
        true,
        (source, gainNode) => {
          this.backgroundSource = source;
          this.backgroundGainNode = gainNode;
          gainNode.gain.value = this.backgroundVolume; // Apply current volume
          // On end, automatically replay
          source.onended = () => this.playBackgroundSound();
        }
      );
    } catch (error) {
    }
  }

  /**
   * Stop background sound
   */
  stopBackgroundSound() {
    if (this.backgroundSource) {
      try {
        this.backgroundSource.stop();
      } catch (e) {
        // Already stopped
      }
      this.backgroundSource = null;
    }
  }

  /**
   * Play walk sound (loops while walking)
   */
  async startWalkSound() {
    if (!this.audioEnabled || !this.audioContext) return;

    // Already walking, don't start another
    if (this.isWalking) return;

    try {
      if (!this.walkAudio) {
        this.walkAudio = await this.loadAudioFile("/sounds/walkSound.mp3");
      }

      this.isWalking = true;

      this._playAudioBuffer(
        this.walkAudio,
        true,
        (source, gainNode) => {
          this.walkSource = source;
          this.walkGainNode = gainNode;
          gainNode.gain.value = this.walkVolume * 0.35; // Apply walk volume with its base reduction
          // Auto-loop only if still walking
          source.onended = () => {
            if (this.isWalking && this.walkSource === source) {
              this.startWalkSound();
            }
          };
        },
        0.35 // Reduced walk sound volume (35%)
      );
    } catch (error) {
      this.isWalking = false;
    }
  }

  /**
   * Stop walk sound (no loop on next end)
   */
  stopWalkSound() {
    if (!this.isWalking) return; // Already stopped
    
    this.isWalking = false;
    
    // Stop the current walk source if it exists
    if (this.walkSource) {
      try {
        this.walkSource.stop();
      } catch (e) {
        // Already stopped
      }
      this.walkSource = null;
    }
  }

  /**
   * Schedule next random event sound
   */
  scheduleNextEventSound() {
    if (!this.audioEnabled || this.eventSounds.length === 0) {
      return;
    }

    if (this.eventTimeout) clearTimeout(this.eventTimeout);

    const delay = Math.random() * (this.eventIntervalMax - this.eventIntervalMin) + this.eventIntervalMin;

    this.eventTimeout = setTimeout(() => {
      if (!this.isEventPlaying) {
        this.playRandomEventSound();
      } else {
        this.scheduleNextEventSound();
      }
    }, delay);
  }

  /**
   * Play a random event sound
   */
  playRandomEventSound() {
    if (!this.audioEnabled || this.eventSounds.length === 0 || this.isEventPlaying) {
      return;
    }

    // Try up to 3 times to find a playable sound
    let attempts = 0;
    const maxAttempts = 3;
    
    const tryPlay = () => {
      if (attempts >= maxAttempts) {
        // Give up and schedule next
        this.isEventPlaying = false;
        this.scheduleNextEventSound();
        return;
      }
      
      attempts++;
      const randomIndex = Math.floor(Math.random() * this.eventSounds.length);
      const audio = this.eventSounds[randomIndex];

      // Check if audio element is valid and can play
      if (!audio || audio.readyState === 0 || audio.networkState === 3) {
        // Audio failed to load, try next one
        tryPlay();
        return;
      }

      this.isEventPlaying = true;

      // Reset and set volume before attempt to play
      audio.currentTime = 0;
      audio.volume = this.eventVolume; // Apply event volume
      
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            // Successfully started playing
          })
          .catch((error) => {
            // Playback failed, increment attempts and try again
            attempts++;
            if (attempts < maxAttempts) {
              tryPlay();
            } else {
              this.isEventPlaying = false;
              this.scheduleNextEventSound();
            }
          });
      }

      // Schedule next sound when this one ends
      const onEnded = () => {
        this.isEventPlaying = false;
        audio.removeEventListener('ended', onEnded);
        this.scheduleNextEventSound();
      };
      
      audio.onended = onEnded;
    };
    
    tryPlay();
  }

  /**
   * Helper method to play audio buffer
   * @private
   */
  _playAudioBuffer(buffer, loop = false, onSourceCreated = null, volume = 0.7, gainNodeRef = null) {
    try {
      if (!this.audioContext) {
        throw new Error("AudioContext not available");
      }

      const source = this.audioContext.createBufferSource();
      source.buffer = buffer;
      source.loop = loop;

      // Create gain node for volume control
      const gainNode = this.audioContext.createGain();
      gainNode.gain.value = volume; // Volume control

      source.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      if (onSourceCreated) onSourceCreated(source, gainNode);

      source.start(0);
    } catch (error) {
      // Silent fail
    }
  }

  /**
   * Set background sound volume (0.0 to 1.0)
   */
  setBackgroundVolume(volume) {
    const vol = Math.max(0, Math.min(1, volume));
    this.backgroundVolume = vol;
    if (this.backgroundGainNode) {
      this.backgroundGainNode.gain.value = vol;
    }
  }

  /**
   * Set walk sound volume (0.0 to 1.0)
   */
  setWalkVolume(volume) {
    const vol = Math.max(0, Math.min(1, volume));
    this.walkVolume = vol;
    if (this.walkGainNode) {
      this.walkGainNode.gain.value = vol * 0.35; // Apply with base reduction
    }
  }

  /**
   * Set event sounds volume (0.0 to 1.0)
   */
  setEventVolume(volume) {
    const vol = Math.max(0, Math.min(1, volume));
    this.eventVolume = vol;
    // Update all event audio elements
    this.eventSounds.forEach((audio) => {
      audio.volume = vol;
    });
  }

  /**
   * Set volume for all sounds (0.0 to 1.0)
   */
  setMasterVolume(volume) {
    const vol = Math.max(0, Math.min(1, volume));
    this.setBackgroundVolume(vol);
    this.setWalkVolume(vol);
    this.setEventVolume(vol);
  }

  /**
   * Pause event sounds (skip current, pause scheduling)
   */
  pauseEvents() {
    // Stop current event if playing
    if (this.isEventPlaying) {
      const currentAudio = this.eventSounds.find(audio => audio.currentTime > 0 && !audio.paused);
      if (currentAudio) {
        currentAudio.currentTime = 0;
        currentAudio.pause();
      }
      this.isEventPlaying = false;
    }
    
    // Clear any pending event scheduling
    if (this.eventTimeout) {
      clearTimeout(this.eventTimeout);
      this.eventTimeout = null;
    }
  }

  /**
   * Resume event sounds (restart scheduling)
   */
  resumeEvents() {
    // Restart event scheduling
    this.scheduleNextEventSound();
  }

  /**
   * Enable/Disable all audio
   */
  setAudioEnabled(enabled) {
    this.audioEnabled = enabled;
  }

  /**
   * Clean up audio resources on game end
   */
  dispose() {
    this.stopBackgroundSound();
    this.stopWalkSound();

    if (this.eventTimeout) clearTimeout(this.eventTimeout);

    if (this.audioContext?.state !== "closed") {
      this.audioContext?.close();
    }

    this.audioContext = null;
    this.initialized = false;
  }
}

// Export singleton instance
export const audioManager = new AudioManager();
export default AudioManager;
