import React from "react";
import "./SettingsMenu.css";
import { audioManager } from "../three/utils/AudioManager.js";
import { keyBindingsManager } from "../utils/KeyBindings.js";

class SettingsMenu extends React.Component {
  constructor(props) {
    super(props);
    const bindings = keyBindingsManager.getBindings();
    this.state = {
      backgroundVolume: audioManager.backgroundVolume * 100,
      walkVolume: audioManager.walkVolume * 100,
      eventVolume: audioManager.eventVolume * 100,
      forwardKey: bindings.forward,
      backwardKey: bindings.backward,
      leftKey: bindings.left,
      rightKey: bindings.right,
      viewToggleKey: bindings.viewToggle,
      pauseKey: bindings.pause,
      movementLayout: this.detectLayout(bindings),
      recordingKey: null, // null or 'forward', 'backward', 'left', 'right', 'viewToggle', 'pause' when recording
    };
  }

  detectLayout(bindings) {
    if (bindings.forward === 'KeyW' && bindings.left === 'KeyA') {
      return 'QWERTY';
    }
    return 'AZERTY';
  }

  handleBackgroundVolumeChange = (e) => {
    const value = parseFloat(e.target.value);
    this.setState({ backgroundVolume: value });
    audioManager.setBackgroundVolume(value / 100);
  };

  handleWalkVolumeChange = (e) => {
    const value = parseFloat(e.target.value);
    this.setState({ walkVolume: value });
    audioManager.setWalkVolume(value / 100);
  };

  handleEventVolumeChange = (e) => {
    const value = parseFloat(e.target.value);
    this.setState({ eventVolume: value });
    audioManager.setEventVolume(value / 100);
  };

  handleMovementLayout = (layout) => {
    keyBindingsManager.setPreset(layout);
    const bindings = keyBindingsManager.getBindings();
    this.setState({ 
      movementLayout: layout,
      forwardKey: bindings.forward,
      backwardKey: bindings.backward,
      leftKey: bindings.left,
      rightKey: bindings.right,
    });
  };

  startRecordingKey = (keyType) => {
    this.setState({ recordingKey: keyType });
  };

  handleKeyRecording = (e) => {
    if (!this.state.recordingKey) return;
    
    e.preventDefault();
    const keyCode = e.code;
    
    if (keyCode === 'Escape') {
      this.setState({ recordingKey: null });
      return;
    }

    const movementKeys = ['forward', 'backward', 'left', 'right'];
    if (movementKeys.includes(this.state.recordingKey)) {
      keyBindingsManager.setBinding(this.state.recordingKey, keyCode);
      this.setState({ 
        [this.state.recordingKey + 'Key']: keyCode,
        recordingKey: null,
        movementLayout: this.detectLayout(keyBindingsManager.getBindings()),
      });
    } else if (this.state.recordingKey === 'viewToggle') {
      keyBindingsManager.setBinding('viewToggle', keyCode);
      this.setState({ viewToggleKey: keyCode, recordingKey: null });
    } else if (this.state.recordingKey === 'pause') {
      keyBindingsManager.setBinding('pause', keyCode);
      this.setState({ pauseKey: keyCode, recordingKey: null });
    }
  };

  handleReset = () => {
    keyBindingsManager.resetToDefaults();
    const bindings = keyBindingsManager.getBindings();
    this.setState({
      backgroundVolume: 50,
      walkVolume: 50,
      eventVolume: 50,
      forwardKey: bindings.forward,
      backwardKey: bindings.backward,
      leftKey: bindings.left,
      rightKey: bindings.right,
      viewToggleKey: bindings.viewToggle,
      pauseKey: bindings.pause,
      movementLayout: this.detectLayout(bindings),
      recordingKey: null,
    });
    audioManager.setBackgroundVolume(0.5);
    audioManager.setWalkVolume(0.5);
    audioManager.setEventVolume(0.5);
  };

  getKeyLabel(keyCode) {
    const keyLabels = {
      'KeyZ': 'Z', 'KeyQ': 'Q', 'KeyS': 'S', 'KeyD': 'D',
      'KeyW': 'W', 'KeyA': 'A',
      'KeyV': 'V', 'Escape': 'Echap',
    };
    return keyLabels[keyCode] || keyCode;
  }

  componentDidMount() {
    if (this.state.recordingKey) {
      window.addEventListener('keydown', this.handleKeyRecording);
    }
  }

  componentDidUpdate(prevProps, prevState) {
    if (prevState.recordingKey !== this.state.recordingKey) {
      if (this.state.recordingKey) {
        window.addEventListener('keydown', this.handleKeyRecording);
      } else {
        window.removeEventListener('keydown', this.handleKeyRecording);
      }
    }
  }

  componentWillUnmount() {
    window.removeEventListener('keydown', this.handleKeyRecording);
  }

  render() {
    const inGame = this.props.inGame || false;

    return (
      <div className="settings-menu">
        <div className="settings-container">
          <h2>Parametres</h2>

          {/* Background Volume - Always shown */}
          <div className="setting-group">
            <label htmlFor="background-volume">Son Fond</label>
            <div className="slider-container">
              <input
                id="background-volume"
                type="range"
                min="0"
                max="100"
                value={this.state.backgroundVolume}
                onChange={this.handleBackgroundVolumeChange}
                className="slider"
              />
              <span className="slider-value">
                {Math.round(this.state.backgroundVolume)}%
              </span>
            </div>
          </div>

          {/* Walk Volume - Only in game */}
          {inGame && (
            <div className="setting-group">
              <label htmlFor="walk-volume">Son Marche</label>
              <div className="slider-container">
                <input
                  id="walk-volume"
                  type="range"
                  min="0"
                  max="100"
                  value={this.state.walkVolume}
                  onChange={this.handleWalkVolumeChange}
                  className="slider"
                />
                <span className="slider-value">
                  {Math.round(this.state.walkVolume)}%
                </span>
              </div>
            </div>
          )}

          {/* Event Volume - Only in game */}
          {inGame && (
            <div className="setting-group">
              <label htmlFor="event-volume">Son Evenement</label>
              <div className="slider-container">
                <input
                  id="event-volume"
                  type="range"
                  min="0"
                  max="100"
                  value={this.state.eventVolume}
                  onChange={this.handleEventVolumeChange}
                  className="slider"
                />
                <span className="slider-value">
                  {Math.round(this.state.eventVolume)}%
                </span>
              </div>
            </div>
          )}

          {/* Keyboard Settings */}
          <div className="keyboard-settings">
            <h3>Touches</h3>
            
            {/* Movement Layout Quick Select */}
            <div className="setting-group">
              <label>Disposition</label>
              <div className="layout-buttons">
                <button
                  className={`layout-btn ${this.state.movementLayout === 'AZERTY' ? 'active' : ''}`}
                  onClick={() => this.handleMovementLayout('AZERTY')}
                >
                  AZERTY
                </button>
                <button
                  className={`layout-btn ${this.state.movementLayout === 'QWERTY' ? 'active' : ''}`}
                  onClick={() => this.handleMovementLayout('QWERTY')}
                >
                  QWERTY
                </button>
              </div>
            </div>

            {/* Individual Movement Keys */}
            <div className="movement-keys-grid">
              <div className="key-binding">
                <label>Avance</label>
                <button
                  className={`key-button ${this.state.recordingKey === 'forward' ? 'recording' : ''}`}
                  onClick={() => this.startRecordingKey('forward')}
                >
                  {this.state.recordingKey === 'forward' ? 'Appuyez une touche...' : this.getKeyLabel(this.state.forwardKey)}
                </button>
              </div>

              <div className="key-binding">
                <label>Recule</label>
                <button
                  className={`key-button ${this.state.recordingKey === 'backward' ? 'recording' : ''}`}
                  onClick={() => this.startRecordingKey('backward')}
                >
                  {this.state.recordingKey === 'backward' ? 'Appuyez une touche...' : this.getKeyLabel(this.state.backwardKey)}
                </button>
              </div>

              <div className="key-binding">
                <label>Gauche</label>
                <button
                  className={`key-button ${this.state.recordingKey === 'left' ? 'recording' : ''}`}
                  onClick={() => this.startRecordingKey('left')}
                >
                  {this.state.recordingKey === 'left' ? 'Appuyez une touche...' : this.getKeyLabel(this.state.leftKey)}
                </button>
              </div>

              <div className="key-binding">
                <label>Droit</label>
                <button
                  className={`key-button ${this.state.recordingKey === 'right' ? 'recording' : ''}`}
                  onClick={() => this.startRecordingKey('right')}
                >
                  {this.state.recordingKey === 'right' ? 'Appuyez une touche...' : this.getKeyLabel(this.state.rightKey)}
                </button>
              </div>
            </div>

            {/* POV Toggle Key */}
            <div className="setting-group">
              <label>Changer POV</label>
              <button
                className={`key-button ${this.state.recordingKey === 'viewToggle' ? 'recording' : ''}`}
                onClick={() => this.startRecordingKey('viewToggle')}
              >
                {this.state.recordingKey === 'viewToggle' ? 'Appuyez une touche...' : this.getKeyLabel(this.state.viewToggleKey)}
              </button>
            </div>

            {/* Pause Key */}
            <div className="setting-group">
              <label>Pause</label>
              <button
                className={`key-button ${this.state.recordingKey === 'pause' ? 'recording' : ''}`}
                onClick={() => this.startRecordingKey('pause')}
              >
                {this.state.recordingKey === 'pause' ? 'Appuyez une touche...' : this.getKeyLabel(this.state.pauseKey)}
              </button>
            </div>
          </div>

          {/* Button Container */}
          <div className="button-container">
            <button className="reset-button" onClick={this.handleReset}>
              Reinitialiser
            </button>
            <button className="close-button" onClick={this.props.onClose || this.props.onBack}>
              {this.props.onBack ? "Retour" : "Fermer"}
            </button>
          </div>
        </div>
      </div>
    );
  }
}

export default SettingsMenu;
