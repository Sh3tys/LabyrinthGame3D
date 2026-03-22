import React from "react";
import "./LoadingScreen.css";

const LoadingScreen = ({ isVisible }) => {
  if (!isVisible) return null;

  return (
    <div className="loading-screen">
      <div className="loading-content">
        <div className="spinner"></div>
        <h2>Chargement du labyrinthe...</h2>
        <p>Préparation de votre aventure</p>
      </div>
    </div>
  );
};

export default LoadingScreen;
