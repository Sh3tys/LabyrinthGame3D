import React, { Component } from "react";
import "./GameGUI.css";
import LabyrinthScene from "../three/scenes/LabyrinthScene";
import SettingsMenu from "./SettingsMenu";
import PauseMenu from "./PauseMenu";
import LoadingScreen from "./LoadingScreen";
import { prewarmPlayerAssets } from "../three/utils/preloadAssets.js";
import { audioManager } from "../three/utils/AudioManager.js";
import { keyBindingsManager } from "../utils/KeyBindings.js";

class GameGUI extends Component {
  constructor(props) {
    super(props);
    this.state = {
      isLoading: true,
      isPlaying: false,
      elapsedSeconds: 0,
      hasWon: false,
      showSettings: false,
      isPaused: false,
      showSettingsFromPause: false,
    };
    this.timerInterval = null;
    this.sceneRef = React.createRef();
    this.lastPauseTime = 0; // Debounce pause key
    this.startGame = this.startGame.bind(this);
    this.handleGameExit = this.handleGameExit.bind(this);
    this.toggleSettings = this.toggleSettings.bind(this);
    this.togglePause = this.togglePause.bind(this);
    this.handlePauseSettings = this.handlePauseSettings.bind(this);
    this.handleBackFromSettings = this.handleBackFromSettings.bind(this);
    this.handlePauseExit = this.handlePauseExit.bind(this);
    this.handleKeyDown = this.handleKeyDown.bind(this);
  }

  // Lance la partie 3D
  async startGame() {
    this.setState({ isPlaying: true, elapsedSeconds: 0, hasWon: false, isPaused: false, showSettingsFromPause: false });
    
    // Wait a brief moment to ensure UI state updates before audio operations
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Ensure audio context is initialized before playing background sound
    if (!audioManager.initialized) {
      await audioManager.init();
    }
    
    // Resume audio context and play background music
    await audioManager.resumeAudioContext();
    await audioManager.playBackgroundSound();
    
    this.timerInterval = setInterval(() => {
      this.setState((prev) => ({ elapsedSeconds: prev.elapsedSeconds + 1 }));
    }, 1000);
  }

  handleGameExit() {
    if (this.timerInterval) clearInterval(this.timerInterval);
    audioManager.stopBackgroundSound(); // Stop background music
    this.setState({ hasWon: true, isPaused: false, showSettingsFromPause: false });
  }

  toggleSettings() {
    if (this.state.isPlaying && !this.state.hasWon) {
      // If in game, toggle pause with settings
      return;
    }
    this.setState((prev) => ({ showSettings: !prev.showSettings }), () => {
      // Refresh key bindings when settings close
      if (!this.state.showSettings && this.sceneRef.current) {
        this.sceneRef.current.refreshKeyBindings();
      }
    });
  }

  togglePause() {
    this.setState((prev) => ({
      isPaused: !prev.isPaused,
      showSettingsFromPause: false,
    }));

    if (!this.state.isPaused) {
      // Pausing - stop timer and pause events
      if (this.timerInterval) clearInterval(this.timerInterval);
      audioManager.pauseEvents(); // Skip current event and pause scheduling
    } else {
      // Resuming - restart timer and events
      this.timerInterval = setInterval(() => {
        this.setState((prev) => ({ elapsedSeconds: prev.elapsedSeconds + 1 }));
      }, 1000);
      audioManager.resumeEvents(); // Resume event scheduling
    }
  }

  handlePauseSettings() {
    this.setState({ showSettingsFromPause: true });
  }

  handleBackFromSettings() {
    this.setState({ showSettingsFromPause: false }, () => {
      // Refresh key bindings when settings close
      if (this.sceneRef.current) {
        this.sceneRef.current.refreshKeyBindings();
      }
    });
  }

  handlePauseExit() {
    if (this.timerInterval) clearInterval(this.timerInterval);
    audioManager.stopBackgroundSound(); // Stop background music
    this.setState({ isPlaying: false, isPaused: false, showSettingsFromPause: false, hasWon: false });
  }

  handleKeyDown(e) {
    const pauseKey = keyBindingsManager.getBinding('pause');
    if (e.code === pauseKey && this.state.isPlaying && !this.state.hasWon) {
      // Debounce: prevent pause from triggering twice within 200ms
      const now = Date.now();
      if (now - this.lastPauseTime < 200) {
        e.preventDefault();
        return;
      }
      this.lastPauseTime = now;
      
      e.preventDefault();
      this.togglePause();
    }
  }

  componentDidMount() {
    // Load assets only (audio will init on first user interaction)
    const initializeApp = async () => {
      try {
        // Preload player assets
        const preloadPromise = prewarmPlayerAssets();
        
        // Wait for preload with a max timeout of 8 seconds
        await Promise.race([
          preloadPromise,
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Preload timeout')), 8000)
          )
        ]);
        
        // Give a brief moment for UI to be fully ready
        await new Promise(resolve => setTimeout(resolve, 300));
        this.setState({ isLoading: false });
      } catch (error) {
        console.warn('Preload warning:', error);
        // Hide loading screen after timeout regardless of errors
        this.setState({ isLoading: false });
      }
    };
    
    initializeApp();
    window.addEventListener("keydown", this.handleKeyDown);
  }

  componentWillUnmount() {
    if (this.timerInterval) clearInterval(this.timerInterval);
    audioManager.dispose(); // Clean up audio resources
    window.removeEventListener("keydown", this.handleKeyDown);
  }

  formatTime(totalSeconds) {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }

  // Affiche le menu avec le bouton Play
  renderMenu() {
    return (
      <div className="menu-layout">
        <h1>Labyrinthe</h1>
        <div className="button-column">
          <button className="play-button" onClick={this.startGame}>
            JOUER
          </button>
          <button className="settings-button" onClick={this.toggleSettings}>
            Parametres
          </button>
        </div>
      </div>
    );
  }

  // affichage principale
  render() {
    // Show loading screen while initializing
    if (this.state.isLoading) {
      return <LoadingScreen isVisible={true} />;
    }

    return (
      <div className="game-gui-container">
        {this.state.showSettings && !this.state.isPlaying && (
          <SettingsMenu onClose={this.toggleSettings} />
        )}
        {this.state.showSettingsFromPause && (
          <SettingsMenu onBack={this.handleBackFromSettings} inGame={true} />
        )}
        {this.state.isPaused && !this.state.showSettingsFromPause && (
          <PauseMenu
            onContinue={this.togglePause}
            onSettings={this.handlePauseSettings}
            onExit={this.handlePauseExit}
          />
        )}
        {this.state.hasWon ? (
          <div className="menu-layout">
            <h1>Bravo !</h1>
            <p>Tu as trouvé la sortie en {this.formatTime(this.state.elapsedSeconds)} !</p>
            <button className="play-button" onClick={this.startGame}>Rejouer</button>
          </div>
        ) : this.state.isPlaying ? (
          <>
            {/* On injecte le callback dans LabyrinthScene via une prop */}
            <LabyrinthScene ref={this.sceneRef} onExit={this.handleGameExit} />
            <div className="timer-overlay">
              {this.formatTime(this.state.elapsedSeconds)}
            </div>
          </>
        ) : (
          this.renderMenu()
        )}
      </div>
    );
  }
}

export default GameGUI;
