import React, { Component } from "react";
import "./GameGUI.css";
import LabyrinthScene from "../three/scenes/LabyrinthScene";
import { prewarmPlayerAssets } from "../three/utils/preloadAssets.js";

class GameGUI extends Component {
  constructor(props) {
    super(props);

    // État simple : est-on en train de jouer ?
    this.state = {
      isPlaying: false,
      elapsedSeconds: 0,
    };

    this.timerInterval = null;

    // Liaison de l'événement clic
    this.startGame = this.startGame.bind(this);
  }

  // Lance la partie 3D
  startGame() {
    this.setState({ isPlaying: true, elapsedSeconds: 0 });
    this.timerInterval = setInterval(() => {
      this.setState((prev) => ({ elapsedSeconds: prev.elapsedSeconds + 1 }));
    }, 1000);
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
        {this.state.isPlaying ? (
          <>
            <LabyrinthScene />
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
