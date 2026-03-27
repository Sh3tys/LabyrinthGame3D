import React, {
  useState,
  useRef,
  forwardRef,
  useImperativeHandle,
} from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { Player } from "../objects/Player.jsx";
import { Labyrinth } from "../objects/labyrinth/Labyrinth.jsx";
import { audioManager } from "../utils/AudioManager.js";

// Set to false to hide the FPS counter
const SHOW_FPS = true;

// Component to manage ambient light visibility based on camera mode
function TopViewAmbientLight({ cameraMode }) {
  const ambientLightRef = useRef(null);

  useFrame(() => {
    if (ambientLightRef.current) {
      // Enable ambient light only when in TOP view
      ambientLightRef.current.intensity = cameraMode === "TOP" ? 5 : 0.35;
    }
  });

  return (
    <ambientLight ref={ambientLightRef} intensity={0.35} color="#c8d8ff" />
  );
}

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
  const ambientLightRef = useRef(null);

  useImperativeHandle(
    ref,
    () => ({
      refreshKeyBindings: () => {
        if (playerRef.current) {
          playerRef.current.refreshKeyBindings();
        }
      },
    }),
    [],
  );

  const handleLabyrinthReady = (provider) => {
    setWalls(provider);
    if (provider?.getSpawnPoint) {
      const p = provider.getSpawnPoint();
      setSpawn([p.x, p.y, p.z]);
    }
  };

  const handleCanvasClick = (gl) => {
    // Request pointer lock on canvas click
    if (gl && gl.domElement) {
      gl.domElement.requestPointerLock =
        gl.domElement.requestPointerLock || gl.domElement.mozRequestPointerLock;
      gl.domElement.requestPointerLock();
    }
    // Resume audio context on user interaction (browser security requirement)
    audioManager.resumeAudioContext();
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
        onCreated={({ gl }) => {
          handleCanvasClick(gl);
          // Initialize audio on first user interaction (browser autoplay policy)
          const initAudioOnInteraction = async () => {
            if (!audioManager.initialized) {
              await audioManager.init();
            }
            audioManager.resumeAudioContext();
          };
          // Add listeners for all user interactions to init and resume audio
          gl.domElement.addEventListener("click", initAudioOnInteraction, {
            once: true,
          });
          gl.domElement.addEventListener("mousedown", initAudioOnInteraction, {
            once: true,
          });
          window.addEventListener("keydown", initAudioOnInteraction, {
            once: true,
          });

          // Handle WebGL context loss
          gl.domElement.addEventListener("webglcontextlost", (e) => {
            console.warn("WebGL context lost, attempting recovery...");
            e.preventDefault();
          });
          gl.domElement.addEventListener("webglcontextrestored", () => {
            console.log("WebGL context restored");
          });
        }}
      >
        <color attach="background" args={["#0d1117"]} />
        {/* Fog atmosphérique */}
        <fog attach="fog" args={["#0d1117", 20, 80]} />

        {/* Lumière ambiante douce - visibility managed by camera mode */}
        <TopViewAmbientLight cameraMode={cameraMode} />

        {/* Lumière hémisphérique pour sol/ciel */}
        <hemisphereLight
          intensity={0.4}
          color="#dbe8ff"
          groundColor="#2a1a0a"
        />

        {/* Lumière directionnelle principale (soleil) */}
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

        {/* Point light chaud au centre pour l'ambiance */}
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

        {walls && spawn ? (
          <Player
            ref={playerRef}
            walls={walls}
            initialPosition={spawn}
            onExit={onExit}
            onCameraModeSwitched={setCameraMode}
          />
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
});

LabyrinthScene.displayName = "LabyrinthScene";

export default LabyrinthScene;
