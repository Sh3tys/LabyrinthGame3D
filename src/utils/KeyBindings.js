/**
 * KeyBindings
 * -----------
 * Manages keyboard binding configuration with localStorage persistence
 */

const DEFAULT_BINDINGS = {
  forward: 'KeyW',
  backward: 'KeyS',
  left: 'KeyA',
  right: 'KeyD',
  viewToggle: 'KeyV',
  pause: 'Escape',
};

// Preset layouts
const PRESET_LAYOUTS = {
  AZERTY: {
    forward: 'KeyZ',
    backward: 'KeyS',
    left: 'KeyQ',
    right: 'KeyD',
  },
  QWERTY: {
    forward: 'KeyW',
    backward: 'KeyS',
    left: 'KeyA',
    right: 'KeyD',
  },
};

class KeyBindingsManager {
  constructor() {
    this.bindings = this.loadBindings();
  }

  loadBindings() {
    try {
      const saved = localStorage.getItem('keyBindings');
      return saved ? { ...DEFAULT_BINDINGS, ...JSON.parse(saved) } : DEFAULT_BINDINGS;
    } catch (e) {
      console.error('Failed to load key bindings:', e);
      return DEFAULT_BINDINGS;
    }
  }

  saveBindings() {
    try {
      localStorage.setItem('keyBindings', JSON.stringify(this.bindings));
    } catch (e) {
      console.error('Failed to save key bindings:', e);
    }
  }

  getBinding(action) {
    return this.bindings[action];
  }

  setBinding(action, keyCode) {
    this.bindings[action] = keyCode;
    this.saveBindings();
  }

  setPreset(presetName) {
    const preset = PRESET_LAYOUTS[presetName];
    if (!preset) return false;
    
    Object.assign(this.bindings, preset);
    this.saveBindings();
    return true;
  }

  resetToDefaults() {
    this.bindings = { ...DEFAULT_BINDINGS };
    this.saveBindings();
  }

  getBindings() {
    return { ...this.bindings };
  }

  getPresets() {
    return Object.keys(PRESET_LAYOUTS);
  }
}

export const keyBindingsManager = new KeyBindingsManager();
