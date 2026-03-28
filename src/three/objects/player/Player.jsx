import React, {
  useEffect,
  useRef,
  forwardRef,
  useImperativeHandle,
} from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { PlayerCharacter } from "./PlayerCharacter.js";

/**
 * <Player /> — thin React wrapper around PlayerCharacter.
 *
 * Must be placed inside a react-three-fiber <Canvas>.
 * It creates the PlayerCharacter on mount, calls update() every
 * frame via useFrame, and disposes on unmount.
 *
 * Props:
 *   walls - optional collision provider with resolveCollisions()
 *   onExit - callback when player exits
 *   onCameraModeSwitched - callback when camera mode changes (receives new mode: 'FPV', 'TPV', or 'TOP')
 */
const PlayerComponent = forwardRef(
  (
    { walls, initialPosition = [0, 0, 0], onExit, onCameraModeSwitched },
    ref,
  ) => {
    const { scene, camera, gl } = useThree();
    const playerRef = useRef(null);
    const [startX, startY, startZ] = initialPosition;
    const exitRef = useRef(null);
    const hasExited = useRef(false);

    useImperativeHandle(
      ref,
      () => ({
        refreshKeyBindings: () => {
          if (playerRef.current && playerRef.current.input) {
            playerRef.current.input.refreshKeyBindings();
          }
        },
      }),
      [],
    );

    useEffect(() => {
      const player = new PlayerCharacter(scene, camera, gl.domElement);
      player.position.set(startX, startY, startZ);
      player.onCameraModeSwitched = onCameraModeSwitched;
      player.load();
      playerRef.current = player;

      return () => player.dispose();
    }, [scene, camera, gl, startX, startY, startZ, onCameraModeSwitched]);

    useEffect(() => {
      if (playerRef.current) {
        playerRef.current.walls = walls || null;
        // Récupère la position de sortie si possible
        if (walls && typeof walls.getExitPoint === "function") {
          exitRef.current = walls.getExitPoint();
        }
      }
    }, [walls]);

    useFrame(() => {
      if (!playerRef.current || !exitRef.current || hasExited.current) return;
      const pos = playerRef.current.position;
      const exit = exitRef.current;
      // On veut que la sortie ne se fasse que si le joueur touche la "zone d'ouverture" (mur EST ou SUD retiré)
      // On récupère la taille d'une cellule (cellSize) et la position du centre de la cellule de sortie
      const cellSize = playerRef.current.walls?.getMazeSize?.().cellSize || 2;
      const margin = 0.45; // marge pour tolérance
      // On considère la sortie si le joueur touche le bord EST ou SUD de la cellule de sortie
      const estX = exit.x + cellSize / 2;
      const sudZ = exit.z + cellSize / 2;
      // Teste si le joueur est "au-delà" du mur EST ou SUD (avec une petite tolérance)
      const toucheEst =
        Math.abs(pos.x - estX) < margin &&
        Math.abs(pos.z - exit.z) < cellSize / 2 - margin;
      const toucheSud =
        Math.abs(pos.z - sudZ) < margin &&
        Math.abs(pos.x - exit.x) < cellSize / 2 - margin;
      if (toucheEst || toucheSud) {
        hasExited.current = true;
        if (typeof onExit === "function") onExit();
      }
    });

    useFrame((_, delta) => {
      if (playerRef.current) {
        playerRef.current.update(delta);
      }
    });

    return null;
  },
);

PlayerComponent.displayName = "Player";
export const Player = PlayerComponent;
