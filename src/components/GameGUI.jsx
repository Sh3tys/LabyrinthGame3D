import React, { Component } from 'react';
import './GameGUI.css';
import LabyrinthScene from '../three/scenes/LabyrinthScene';

class GameGUI extends Component {
  constructor(props) {
    super(props);
    
// État simple : est-on en train de jouer ?
    this.state = {
      isPlaying: false
    };

// Liaison de l'événement clic
    this.startGame = this.startGame.bind(this);
  }

// Lance la partie 3D
  startGame() {
    this.setState({ isPlaying: true });
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
          <LabyrinthScene />
        ) : (
          this.renderMenu()
        )}
      </div>
    );
  }
}

export default GameGUI;
