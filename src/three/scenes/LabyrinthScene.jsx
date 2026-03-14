import React, { useState, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { Player } from "../objects/Player.jsx";
import { Labyrinth } from "../objects/Labyrinth.jsx";

// Set to false to hide the FPS counter
const SHOW_FPS = true;

function FPSTracker({ domRef }) {
  const frameCount = useRef(0);
  const lastTime = useRef(null);

  useFrame((state) => {
    console.log("Draw calls:", state.gl.info.render.calls);
  });

  useFrame(() => {
    const now = performance.now();

    if (lastTime.current === null) {
      lastTime.current = now;
      return;
    }

    frameCount.current += 1;
    const delta = now - lastTime.current;

    if (delta >= 500) {
      const fps = Math.round((frameCount.current / delta) * 1000);
      if (domRef.current) domRef.current.textContent = `FPS: ${fps}`;

      frameCount.current = 0;
      lastTime.current = now;
    }
  });

  return null;
}

const LabyrinthScene = () => {
  const [walls, setWalls] = useState(null);
  const [spawn, setSpawn] = useState(null);
  const fpsRef = useRef(null);

  const handleLabyrinthReady = (provider) => {
    setWalls(provider);
    if (provider?.getSpawnPoint) {
      const p = provider.getSpawnPoint();
      setSpawn([p.x, p.y, p.z]);
    }
  };

  return (
    <>
      <Canvas
        camera={{ position: [0, 5, 10], fov: 60 }}
        style={{ width: "100vw", height: "100vh", background: "#08080a" }}
        dpr={[1, 1.25]}
        gl={{ antialias: true, powerPreference: "high-performance" }}
        shadows={{ type: THREE.PCFShadowMap }}
      >
        <color attach="background" args={["#0d1117"]} />
        {/* Fog further away so we can actually see the maze */}
        <fog attach="fog" args={["#0d1117", 25, 160]} />

        <ambientLight intensity={0.55} color="#f2f4ff" />
        <hemisphereLight
          intensity={0.5}
          color="#dbe8ff"
          groundColor="#1f2b38"
        />

        {/* Main sun-like light for readable depth and shadows */}
        <directionalLight
          position={[16, 26, 10]}
          intensity={1.45}
          color="#fff4d8"
          castShadow
          shadow-mapSize={[1024, 1024]}
          shadow-camera-near={1}
          shadow-camera-far={180}
          shadow-camera-left={-50}
          shadow-camera-right={50}
          shadow-camera-top={50}
          shadow-camera-bottom={-50}
        />

        <pointLight position={[0, 16, 0]} intensity={0.45} color="#9bd6ff" />

        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[260, 260]} />
          <meshStandardMaterial
            color="#232c38"
            roughness={0.9}
            metalness={0.03}
          />
        </mesh>

        <Labyrinth
          width={21}
          height={21}
          cellSize={3}
          onReady={handleLabyrinthReady}
        />

        {walls && spawn ? (
          <Player walls={walls} initialPosition={spawn} />
        ) : null}
        {SHOW_FPS && <FPSTracker domRef={fpsRef} />}
      </Canvas>

      {SHOW_FPS && (
        <div
          ref={fpsRef}
          style={{
            position: "fixed",
            top: "16px",
            left: "16px",
            color: "#00ff44",
            fontFamily: "'Courier New', monospace",
            fontSize: "16px",
            fontWeight: "bold",
            background: "rgba(0,0,0,0.45)",
            padding: "4px 10px",
            borderRadius: "6px",
            pointerEvents: "none",
            userSelect: "none",
            zIndex: 200,
          }}
        >
          FPS: --
        </div>
      )}
    </>
  );
};

export default LabyrinthScene;
