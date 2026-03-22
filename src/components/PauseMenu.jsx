import React from "react";
import "./PauseMenu.css";

class PauseMenu extends React.Component {
  render() {
    return (
      <div className="pause-menu">
        <div className="pause-container">
          <h2>PAUSE</h2>

          <div className="pause-buttons">
            <button
              className="pause-button continue-button"
              onClick={this.props.onContinue}
            >
              Continuer
            </button>

            <button
              className="pause-button settings-button"
              onClick={this.props.onSettings}
            >
              Parametres
            </button>

            <button
              className="pause-button exit-button"
              onClick={this.props.onExit}
            >
              Quitter
            </button>
          </div>
        </div>
      </div>
    );
  }
}

export default PauseMenu;
