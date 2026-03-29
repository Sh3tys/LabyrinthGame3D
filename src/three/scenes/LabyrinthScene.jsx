import React, {
  useState,
  useRef,
  forwardRef,
  useImperativeHandle,
} from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { Player } from "../objects/player/Player.jsx";
import { Labyrinth } from "../objects/labyrinth/Labyrinth.jsx";
import { audioManager } from "../utils/AudioManager.js";

const SHOW_FPS = true;

// Manage ambient light intensity based on camera mode
function TopViewAmbientLight({ cameraMode }) {
  const ambientLightRef = useRef(null);

  useFrame(() => {
    if (ambientLightRef.current) {
      ambientLightRef.current.intensity = cameraMode === "TOP" ? 80 : 0.7;
    }
  });

  return <ambientLight ref={ambientLightRef} intensity={0.7} color="#00cc33" />;
}

// Display FPS counter
function FPSTracker({ domRef }) {
  const frameCount = useRef(0);
  const lastTime = useRef(null);

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

const LabyrinthScene = forwardRef(({ onExit }, ref) => {
  const [walls, setWalls] = useState(null);
  const [spawn, setSpawn] = useState(null);
  const [cameraMode, setCameraMode] = useState("FPV");
  const fpsRef = useRef(null);
  const playerRef = useRef(null);

  useImperativeHandle(
    ref,
    () => ({
      refreshKeyBindings: () => {
        if (playerRef.current) playerRef.current.refreshKeyBindings();
      },
    }),
    [],
  );

  const handleLabyrinthReady = (provider) => {
    setWalls(provider);
    const p = provider?.getSpawnPoint?.();
    if (p) setSpawn([p.x, p.y, p.z]);
  };

  const initAudio = async () => {
    if (!audioManager.initialized) {
      await audioManager.init();
    }
    await audioManager.resumeAudioContext();
  };

  const setupCanvas = ({ gl }) => {
    const canvas = gl.domElement;

    // Request pointer lock on click
    canvas.requestPointerLock =
      canvas.requestPointerLock || canvas.mozRequestPointerLock;
    canvas.addEventListener("click", () => canvas.requestPointerLock());

    // Initialize audio on first user interaction
    canvas.addEventListener("click", initAudio, { once: true });
    canvas.addEventListener("mousedown", initAudio, { once: true });
    window.addEventListener("keydown", initAudio, { once: true });

    // Handle WebGL context loss
    canvas.addEventListener("webglcontextlost", (e) => {
      console.warn("WebGL context lost");
      e.preventDefault();
    });
    canvas.addEventListener("webglcontextrestored", () => {
      console.log("WebGL context restored");
    });
  };

  return (
    <>
      <Canvas
        camera={{ position: [0, 5, 10], fov: 60 }}
        style={{ width: "100vw", height: "100vh", background: "#08080a" }}
        dpr={[1, 1.25]}
        gl={{
          antialias: true,
          powerPreference: "high-performance",
          failOnWebGL1: false,
        }}
        shadows={{ type: THREE.PCFShadowMap }}
        onCreated={setupCanvas}
      >
        <color attach="background" args={["#0d1117"]} />
        <fog attach="fog" args={["#0d1117", 20, 80]} />

        <TopViewAmbientLight cameraMode={cameraMode} />

        <hemisphereLight
          intensity={0.4}
          color="#dbe8ff"
          groundColor="#2a1a0a"
        />

        <directionalLight
          position={[20, 50, 10]}
          intensity={1.5}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-camera-left={-60}
          shadow-camera-right={60}
          shadow-camera-top={60}
          shadow-camera-bottom={-60}
          shadow-camera-near={1}
          shadow-camera-far={150}
          shadow-bias={-0.0003}
          color="#fdb437"
        />

        <pointLight
          position={[0, 8, 0]}
          intensity={0.6}
          color="#ffb347"
          distance={40}
          decay={2}
        />

        <Labyrinth
          width={21}
          height={21}
          cellSize={3}
          onReady={handleLabyrinthReady}
        />

        {walls && spawn && (
          <Player
            ref={playerRef}
            walls={walls}
            initialPosition={spawn}
            onExit={onExit}
            onCameraModeSwitched={setCameraMode}
          />
        )}

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
});

LabyrinthScene.displayName = "LabyrinthScene";

export default LabyrinthScene;
