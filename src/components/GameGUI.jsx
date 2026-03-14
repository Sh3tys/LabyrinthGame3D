import React, { Component } from "react";
import "./GameGUI.css";
import LabyrinthScene from "../three/scenes/LabyrinthScene";
import { prewarmPlayerAssets } from "../three/utils/preloadAssets.js";

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

  // Lance la partie 3D
  startGame() {
    this.setState({ isPlaying: true, elapsedSeconds: 0, hasWon: false });
    this.timerInterval = setInterval(() => {
      this.setState((prev) => ({ elapsedSeconds: prev.elapsedSeconds + 1 }));
    }, 1000);
  }

  handleGameExit() {
    if (this.timerInterval) clearInterval(this.timerInterval);
    this.setState({ hasWon: true });
  }

  componentDidMount() {
    prewarmPlayerAssets();
  }

  componentWillUnmount() {
    if (this.timerInterval) clearInterval(this.timerInterval);
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
        <button className="play-button" onClick={this.startGame}>
          JOUER
        </button>
      </div>
    );
  }

  // affichage principale
  render() {
    return (
      <div className="game-gui-container">
        {this.state.hasWon ? (
          <div className="menu-layout">
            <h1>Bravo !</h1>
            <p>Tu as trouvé la sortie en {this.formatTime(this.state.elapsedSeconds)} !</p>
            <button className="play-button" onClick={this.startGame}>Rejouer</button>
          </div>
        ) : this.state.isPlaying ? (
          <>
            {/* On injecte le callback dans LabyrinthScene via une prop */}
            <LabyrinthScene onExit={this.handleGameExit} />
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
