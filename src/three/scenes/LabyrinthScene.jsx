import React from "react";
import { Canvas } from "@react-three/fiber";
import { Player } from "../objects/Player.jsx";

/**
 * LabyrinthScene
 * --------------
 * Main 3D scene with a ground plane, lights, and the player character.
 * The Player component takes over the camera (FPV/TPV), so OrbitControls
 * is removed — click the canvas to lock the pointer and use WASD to move.
 */
const LabyrinthScene = () => {
  return (
    <Canvas
      camera={{ position: [0, 5, 10], fov: 60 }}
      style={{ width: "100vw", height: "100vh", background: "#202025" }}
    >
      {/* lights */}
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} intensity={1} />

      {/* ground plane rotated flat */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[50, 50]} />
        <meshStandardMaterial color="lightgray" />
      </mesh>

      {/* player character — manages camera, model, input & animations */}
      <Player />
    </Canvas>
  );
};

export default LabyrinthScene;
