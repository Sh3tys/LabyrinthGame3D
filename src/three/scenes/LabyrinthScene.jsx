import React, { useState, useRef, forwardRef, useImperativeHandle } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { Player } from "../objects/Player.jsx";
import { Labyrinth } from "../objects/Labyrinth.jsx";

const SHOW_FPS = true;

// ── FPS Tracker ────────────────────────────────────────────────
function FPSTracker({ domRef }) {
  const frameCount = useRef(0);
  const lastTime   = useRef(null);

  useFrame(() => {
    const now = performance.now();
    if (lastTime.current === null) { lastTime.current = now; return; }
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

// ── 2D Map Overlay ─────────────────────────────────────────────
// Dessinée sur un <canvas> HTML positionné en fixed par-dessus le Canvas 3D.
// Visible uniquement quand player.viewMode === 'TOP'.
function TopViewOverlay2D({ walls, playerInstanceRef }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !walls) return;

    const mazeLinks = walls.getMazeLinks?.();
    if (!mazeLinks) return;

    const { links, cols, rows, startCell, exitCell } = mazeLinks;
    const { cellSize } = walls.getMazeSize();

    let rafId;

    const draw = () => {
      rafId = requestAnimationFrame(draw);

      const player = playerInstanceRef.current;
      const isTop  = player?.viewMode === 'TOP';

      // Afficher / masquer le canvas via opacity CSS
      canvas.style.opacity = isTop ? '1' : '0';
      if (!isTop) return;

      // Resize si besoin (évite de reset si dimensions inchangées)
      const W = window.innerWidth;
      const H = window.innerHeight;
      if (canvas.width  !== W) canvas.width  = W;
      if (canvas.height !== H) canvas.height = H;

      const ctx = canvas.getContext('2d');

      // ── Fond ────────────────────────────────────────────────
      ctx.fillStyle = 'rgba(4, 1, 0, 0.96)';
      ctx.fillRect(0, 0, W, H);

      // ── Calcul de l'espace carte ─────────────────────────────
      const pad    = 64;
      const aspect = cols / rows;
      const availW = W - pad * 2;
      const availH = H - pad * 2;
      let mapW, mapH;
      if (aspect > availW / availH) { mapW = availW; mapH = mapW / aspect; }
      else                          { mapH = availH; mapW = mapH * aspect; }

      const ox     = (W - mapW) / 2;   // offset X canvas
      const oy     = (H - mapH) / 2;   // offset Y canvas
      const cellPx = mapW / cols;

      // ── Bordure de la carte ──────────────────────────────────
      ctx.strokeStyle = '#cc3300';
      ctx.lineWidth   = 2;
      ctx.strokeRect(ox - 3, oy - 3, mapW + 6, mapH + 6);

      // ── Cellules et couloirs ─────────────────────────────────
      const WALL_COLOR     = '#000000';
      const FLOOR_COLOR    = '#1e0900';
      const PASSAGE_COLOR  = '#1e0900';
      const EXIT_BG        = '#2a1000';

      // Fond murs = noir
      ctx.fillStyle = WALL_COLOR;
      ctx.fillRect(ox, oy, mapW, mapH);

      for (let cy = 0; cy < rows; cy++) {
        for (let cx = 0; cx < cols; cx++) {
          const px = ox + cx * cellPx;
          const py = oy + cy * cellPx;
          const isExit = cx === exitCell.x && cy === exitCell.y;

          // Sol de la cellule
          ctx.fillStyle = isExit ? EXIT_BG : FLOOR_COLOR;
          ctx.fillRect(px + 1, py + 1, cellPx - 2, cellPx - 2);

          // Passage EST
          if (cx < cols - 1 && links.get(`${cx},${cy}`)?.has(`${cx + 1},${cy}`)) {
            ctx.fillStyle = PASSAGE_COLOR;
            ctx.fillRect(px + cellPx - 1, py + 1, 2, cellPx - 2);
          }
          // Passage SUD
          if (cy < rows - 1 && links.get(`${cx},${cy}`)?.has(`${cx},${cy + 1}`)) {
            ctx.fillStyle = PASSAGE_COLOR;
            ctx.fillRect(px + 1, py + cellPx - 1, cellPx - 2, 2);
          }
        }
      }

      // ── Marqueur Départ (vert) ───────────────────────────────
      const sx = ox + (startCell.x + 0.5) * cellPx;
      const sy = oy + (startCell.y + 0.5) * cellPx;
      ctx.beginPath();
      ctx.arc(sx, sy, Math.max(3, cellPx * 0.28), 0, Math.PI * 2);
      ctx.fillStyle = '#00e676';
      ctx.fill();

      // ── Marqueur Sortie (orange/or) ──────────────────────────
      const ex = ox + (exitCell.x + 0.5) * cellPx;
      const ey = oy + (exitCell.y + 0.5) * cellPx;
      ctx.beginPath();
      ctx.arc(ex, ey, Math.max(3, cellPx * 0.32), 0, Math.PI * 2);
      ctx.fillStyle = '#ffaa00';
      ctx.fill();

      // ── Position joueur ──────────────────────────────────────
      if (player?.position) {
        const ppx = ox + (player.position.x + cols * cellSize / 2) * cellPx / cellSize;
        const ppy = oy + (player.position.z + rows * cellSize / 2) * cellPx / cellSize;
        const r   = Math.max(4, cellPx * 0.3);

        // Halo
        const grd = ctx.createRadialGradient(ppx, ppy, 0, ppx, ppy, r * 2.5);
        grd.addColorStop(0, 'rgba(255, 80, 0, 0.55)');
        grd.addColorStop(1, 'rgba(255, 80, 0, 0)');
        ctx.beginPath();
        ctx.arc(ppx, ppy, r * 2.5, 0, Math.PI * 2);
        ctx.fillStyle = grd;
        ctx.fill();

        // Point joueur
        ctx.beginPath();
        ctx.arc(ppx, ppy, r, 0, Math.PI * 2);
        ctx.fillStyle   = '#ff3300';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth   = 2;
        ctx.fill();
        ctx.stroke();
      }

      // ── Légende ──────────────────────────────────────────────
      const lx = ox;
      const ly = oy + mapH + 14;
      ctx.font      = '12px monospace';
      ctx.textAlign = 'left';

      ctx.fillStyle = '#00e676'; ctx.fillRect(lx,      ly, 10, 10);
      ctx.fillStyle = '#ccc';    ctx.fillText('Départ',  lx + 14, ly + 10);

      ctx.fillStyle = '#ffaa00'; ctx.fillRect(lx + 80,  ly, 10, 10);
      ctx.fillStyle = '#ccc';    ctx.fillText('Sortie',  lx + 94, ly + 10);

      ctx.fillStyle = '#ff3300'; ctx.fillRect(lx + 160, ly, 10, 10);
      ctx.fillStyle = '#ccc';    ctx.fillText('Joueur',  lx + 174, ly + 10);

      ctx.textAlign   = 'center';
      ctx.fillStyle   = 'rgba(255, 160, 80, 0.55)';
      ctx.font        = '13px monospace';
      ctx.fillText('[ V ] pour revenir en jeu', W / 2, H - 16);
    };

    draw();
    return () => cancelAnimationFrame(rafId);
  }, [walls, playerInstanceRef]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position:      'fixed',
        top:           0,
        left:          0,
        width:         '100vw',
        height:        '100vh',
        opacity:       0,
        transition:    'opacity 0.2s ease',
        zIndex:        100,
        pointerEvents: 'none',
      }}
    />
  );
}

// ── Scene principale ───────────────────────────────────────────
// const LabyrinthScene = ({ onExit }) => {
//   const [walls, setWalls] = useState(null);
//   const [spawn, setSpawn] = useState(null);
//   const fpsRef           = useRef(null);
//   const playerInstanceRef = useRef(null);

const LabyrinthScene = forwardRef(({ onExit }, ref) => {
  const [walls, setWalls] = useState(null);
  const [spawn, setSpawn] = useState(null);
  const fpsRef = useRef(null);
  const playerRef = useRef(null);

  useImperativeHandle(ref, () => ({
    refreshKeyBindings: () => {
      if (playerRef.current) {
        playerRef.current.refreshKeyBindings();
      }
    },
  }), []);

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
  };

  return (
    <>
      <Canvas
        camera={{ position: [0, 5, 10], fov: 60 }}
        style={{ width: "100vw", height: "100vh", background: "#1a0000" }}
        dpr={[1, 1.25]}
        gl={{ antialias: true, powerPreference: "high-performance" }}
        shadows={{ type: THREE.PCFShadowMap }}
        onCreated={({ gl }) => handleCanvasClick(gl)}
      >
        {/* ── Upside Down atmosphere ── */}
        <color attach="background" args={["#1a0300"]} />
        <fog attach="fog" args={["#2d0800", 14, 58]} />

        <ambientLight intensity={0.65} color="#ff4a00" />
        <hemisphereLight intensity={0.5} color="#ff6a00" groundColor="#3a0000" />

        <directionalLight
          position={[10, 30, 5]}
          intensity={1.3}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-camera-left={-65}
          shadow-camera-right={65}
          shadow-camera-top={65}
          shadow-camera-bottom={-65}
          shadow-camera-near={1}
          shadow-camera-far={160}
          shadow-bias={-0.0003}
          color="#ff8c00"
        />

        {/* Points lumineux coins labyrinthe */}
        <pointLight position={[ 0,  8,  0]} intensity={1.8} color="#ff2200" distance={35} decay={2} />
        <pointLight position={[ 15, 6,  15]} intensity={1.0} color="#ff6600" distance={30} decay={2} />
        <pointLight position={[-15, 6, -15]} intensity={1.0} color="#ff4400" distance={30} decay={2} />
        <pointLight position={[ 15, 6, -15]} intensity={0.8} color="#ffaa00" distance={25} decay={2} />
        <pointLight position={[-15, 6,  15]} intensity={0.8} color="#ff3300" distance={25} decay={2} />

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
            instanceRef={playerInstanceRef}
          />
        ) : null}

        {SHOW_FPS && <FPSTracker domRef={fpsRef} />}
      </Canvas>

      {/* ── Overlay carte 2D (mode TOP) ── */}
      {walls && (
        <TopViewOverlay2D walls={walls} playerInstanceRef={playerInstanceRef} />
      )}

      {SHOW_FPS && (
        <div
          ref={fpsRef}
          style={{
            position:    'fixed',
            top:         '16px',
            left:        '16px',
            color:       '#00ff44',
            fontFamily:  "'Courier New', monospace",
            fontSize:    '16px',
            fontWeight:  'bold',
            background:  'rgba(0,0,0,0.45)',
            padding:     '4px 10px',
            borderRadius:'6px',
            pointerEvents:'none',
            userSelect:  'none',
            zIndex:      200,
          }}
        >
          FPS: --
        </div>
      )}
    </>
  );
});

LabyrinthScene.displayName = 'LabyrinthScene';

export default LabyrinthScene;
