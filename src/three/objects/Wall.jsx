import React from "react";

export function Wall({ position, size = [1, 2, 1], color = "#222" }) {
  return (
    <mesh position={position} castShadow receiveShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial 
        color={color} 
        roughness={0.5} 
        metalness={0.1}
        emissive="#110000"
        emissiveIntensity={0.2}
      />
    </mesh>
  );
}
