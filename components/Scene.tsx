import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import { Sparkles, Stars, PerspectiveCamera, Environment } from '@react-three/drei';
import * as THREE from 'three';
import { TreeParticles } from './TreeParticles';
import { GestureType } from '../types';

interface SceneProps {
  gesture: GestureType;
  handPosition: { x: number; y: number };
  photos?: string[];
}

const Snow = () => {
  const count = 2000;
  const mesh = useRef<THREE.Points>(null);
  
  const particles = useMemo(() => {
    const temp = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      temp[i * 3] = (Math.random() - 0.5) * 40;     // x: -20 to 20
      temp[i * 3 + 1] = (Math.random() - 0.5) * 40; // y: -20 to 20
      temp[i * 3 + 2] = (Math.random() - 0.5) * 40; // z: -20 to 20
    }
    return temp;
  }, []);

  useFrame((state, delta) => {
    if (!mesh.current) return;
    const positions = mesh.current.geometry.attributes.position.array as Float32Array;
    
    for (let i = 0; i < count; i++) {
      // Falling down
      positions[i * 3 + 1] -= delta * 1.5;

      // Reset when hitting bottom
      if (positions[i * 3 + 1] < -15) {
        positions[i * 3 + 1] = 15;
        // Reset x/z randomly to keep distribution fresh
        positions[i * 3] = (Math.random() - 0.5) * 40;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 40;
      }

      // Gentle wind sway
      positions[i * 3] += Math.sin(state.clock.elapsedTime * 0.5 + i) * 0.01;
    }
    mesh.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={mesh}>
      <bufferGeometry>
        <bufferAttribute 
          attach="attributes-position" 
          count={count} 
          array={particles} 
          itemSize={3} 
        />
      </bufferGeometry>
      <pointsMaterial 
        size={0.1} 
        color="#ffffff" 
        transparent 
        opacity={0.8} 
        sizeAttenuation={true}
        depthWrite={false}
      />
    </points>
  );
};

export const Scene: React.FC<SceneProps> = ({ gesture, handPosition, photos = [] }) => {
  return (
    <Canvas className="w-full h-full block" gl={{ toneMappingExposure: 1.2 }}>
        <PerspectiveCamera makeDefault position={[0, 0, 12]} fov={50} />
        
        {/* Environment Map is crucial for Gold/Metallic materials to look bright */}
        <Environment preset="sunset" background={false} />
        
        {/* Cinematic Lighting - Boosted for visibility */}
        <ambientLight intensity={0.8} color="#ffffff" />
        <spotLight 
            position={[10, 15, 10]} 
            angle={0.3} 
            penumbra={1} 
            intensity={3.0} 
            color="#ffd700" 
            castShadow 
        />
        {/* Warm Red Fill */}
        <pointLight position={[-10, -5, -10]} intensity={1.5} color="#C41E3A" />
        {/* Cool rim light */}
        <pointLight position={[5, 5, -5]} intensity={1.0} color="#ffffff" />

        {/* The Magic */}
        <TreeParticles gesture={gesture} handPosition={handPosition} photos={photos} />
        
        {/* Falling Snow */}
        <Snow />

        {/* Gold Dust */}
        <Sparkles count={150} scale={12} size={4} speed={0.4} opacity={0.8} color="#ffd700" />
        {/* Multi-colored faint sparkles for atmosphere */}
        <Sparkles count={50} scale={10} size={3} speed={0.2} opacity={0.6} color="#ff3333" />
        <Sparkles count={50} scale={10} size={3} speed={0.2} opacity={0.6} color="#33ff33" />
        
        <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />

        {/* Post Processing for Glow and Film look */}
        <EffectComposer enableNormalPass={false}>
            <Bloom 
                luminanceThreshold={0.6} // Higher threshold so only very bright things glow, preventing washout
                mipmapBlur 
                intensity={1.5} 
                radius={0.5}
            />
            <Vignette eskil={false} offset={0.1} darkness={0.8} />
        </EffectComposer>
    </Canvas>
  );
};