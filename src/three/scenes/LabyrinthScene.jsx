import React from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";

/**
 * A very basic Three.js scene rendered with react-three-fiber.
 * It displays a single plane centered at the origin and adds
 * a couple lights and orbit controls so it can be inspected.
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
        <planeGeometry args={[10, 10]} />
        <meshStandardMaterial color="lightgray" />
      </mesh>

      {/* helper controls so the camera can be dragged around */}
      <OrbitControls />
    </Canvas>
  );
};

export default LabyrinthScene;
